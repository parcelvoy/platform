import Job from '../../queue/Job'
import { createEvent } from '../../users/UserEventRepository'
import { MessageTrigger } from '../MessageTrigger'
import { updateSendState } from '../../campaigns/CampaignService'
import { loadEmailChannel } from './index'
import { loadSendJob, messageLock, prepareSend } from '../MessageTriggerService'
import { EmailTemplate } from '../../render/Template'
import { EncodedJob } from '../../queue'
import App from '../../app'
import { releaseLock } from '../../config/scheduler'
import JourneyProcessJob from '../../journey/JourneyProcessJob'

export default class EmailJob extends Job {
    static $name = 'email'

    static from(data: MessageTrigger): EmailJob {
        return new this(data)
    }

    static async handler(trigger: MessageTrigger, raw: EncodedJob) {
        const data = await loadSendJob<EmailTemplate>(trigger)
        if (!data) return

        const { campaign, template, user, project, context } = data

        // Load email channel so its ready to send
        const channel = await loadEmailChannel(campaign.provider_id, project.id)
        if (!channel) {
            await updateSendState({
                campaign,
                user,
                user_step_id: trigger.user_step_id,
                state: 'aborted',
            })
            App.main.error.notify(new Error('Unabled to send when there is no channel available.'))
            return
        }

        // Check current send rate and if the send is locked
        const isReady = await prepareSend(channel, data, raw)
        if (!isReady) return

        try {
            await channel.send(template, data)
        } catch (error: any) {

            // On error, mark as failed and notify just in case
            await updateSendState({
                campaign,
                user,
                user_step_id: trigger.user_step_id,
                state: 'failed',
            })
            App.main.error.notify(error)
            return
        }

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

        if (context.user_step_id) {
            await JourneyProcessJob.from({ entrance_id: context.user_step_id }).queue()
        }
    }
}
