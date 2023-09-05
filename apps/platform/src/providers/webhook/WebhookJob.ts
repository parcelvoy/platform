import { EncodedJob, Job } from '../../queue'
import { MessageTrigger } from '../MessageTrigger'
import { WebhookTemplate } from '../../render/Template'
import { createEvent } from '../../users/UserEventRepository'
import { updateSendState } from '../../campaigns/CampaignService'
import { loadSendJob, messageLock, prepareSend } from '../MessageTriggerService'
import { loadWebhookChannel } from '.'
import { releaseLock } from '../../config/scheduler'
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

        const { response } = await channel.send(template, data)

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

        await releaseLock(messageLock(campaign, user))

        // if this was triggered by a journey
        if (context.user_step_id) {
            // save response into user step
            await JourneyUserStep.update(q => q.where('id', context.user_step_id), {
                data: {
                    response,
                },
            })
            // trigger processing of this journey entrance
            await JourneyProcessJob.from({ entrance_id: context.user_step_id }).queue()
        }
    }
}
