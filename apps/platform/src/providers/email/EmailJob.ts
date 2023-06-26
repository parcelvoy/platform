import Job from '../../queue/Job'
import { createEvent } from '../../users/UserEventRepository'
import { MessageTrigger } from '../MessageTrigger'
import { updateSendState } from '../../campaigns/CampaignService'
import { loadEmailChannel } from '.'
import { loadSendJob, prepareSend } from '../MessageTriggerService'
import { EmailTemplate } from '../../render/Template'
import { EncodedJob } from '../../queue'
import App from '../../app'

export default class EmailJob extends Job {
    static $name = 'email'

    static from(data: MessageTrigger): EmailJob {
        return new this(data)
    }

    static async handler(trigger: MessageTrigger, raw: EncodedJob) {
        const data = await loadSendJob<EmailTemplate>(trigger)
        if (!data) return

        const { campaign, template, user, project, event, context } = data

        // Load email channel so its ready to send
        const channel = await loadEmailChannel(campaign.provider_id, project.id)
        if (!channel) {
            await updateSendState(campaign, user, 'failed')
            return
        }

        // Check current send rate and if the send is locked
        const isReady = prepareSend(channel, data, raw)
        if (!isReady) return

        try {
            await channel.send(template, { user, event, context })
        } catch (error: any) {

            // On error, mark as failed and notify just in case
            await updateSendState(campaign, user, 'failed')
            App.main.error.notify(error)
        }

        // Update send record
        await updateSendState(campaign, user)

        // Create an event on the user about the email
        await createEvent(user, {
            name: campaign.eventName('sent'),
            data: context,
        })
    }
}
