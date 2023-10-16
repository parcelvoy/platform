import { EncodedJob, Job } from '../../queue'
import { MessageTrigger } from '../MessageTrigger'
import { WebhookTemplate } from '../../render/Template'
import { createEvent } from '../../users/UserEventRepository'
import { updateSendState } from '../../campaigns/CampaignService'
import { loadSendJob, messageLock, prepareSend } from '../MessageTriggerService'
import { loadWebhookChannel } from '.'
import { releaseLock } from '../../config/scheduler'
import { WebhookResponse } from './Webhook'
import App from '../../app'
import { JourneyUserStep } from '../../journey/JourneyStep'
import JourneyProcessJob from '../../journey/JourneyProcessJob'

export default class WebhookJob extends Job {
    static $name = 'webhook'

    static from(data: MessageTrigger): WebhookJob {
        return new this(data)
    }

    static async handler(trigger: MessageTrigger, raw: EncodedJob) {
        const data = await loadSendJob<WebhookTemplate>(trigger)
        if (!data) return

        const { campaign, template, user, project, context } = data

        // Send and render webhook
        const channel = await loadWebhookChannel(campaign.provider_id, project.id)
        if (!channel) {
            await updateSendState({
                campaign,
                user,
                user_step_id: trigger.user_step_id,
                state: 'aborted',
            })
            return
        }

        // Check current send rate and if the send is locked
        const isReady = await prepareSend(channel, data, raw)
        if (!isReady) return

        let sent: WebhookResponse | undefined
        try {
            sent = await channel.send(template, data)
        } catch (error: any) {
            App.main.error.notify(error, {
                send_id: trigger.send_id,
            })
        }

        if (sent?.success) {

            // Update send record
            await updateSendState({
                campaign,
                user,
                user_step_id: trigger.user_step_id,
            })

            // Create an event on the user about the email
            await createEvent(user, {
                name: campaign.eventName('sent'),
                data: context,
            })

            if (sent.response && trigger.user_step_id) {
                await JourneyUserStep.update(q => q.where('id', trigger.user_step_id), {
                    data: {
                        response: sent.response,
                    },
                })
            }

        } else {

            // mark as failed
            await updateSendState({
                campaign,
                user,
                user_step_id: trigger.user_step_id,
                state: 'failed',
            })
        }

        await releaseLock(messageLock(campaign, user))

        if (trigger.user_step_id) {
            await JourneyProcessJob.from({
                entrance_id: trigger.user_step_id,
            }).queue()
        }
    }
}
