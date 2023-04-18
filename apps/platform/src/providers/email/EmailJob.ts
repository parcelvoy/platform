import { createEvent } from '../../users/UserEventRepository'
import { MessageTrigger } from '../MessageTrigger'
import { updateSendState } from '../../campaigns/CampaignService'
import { loadEmailChannel } from '.'
import { loadSendJob } from '../MessageTriggerService'
import { EmailTemplate } from '../../render/Template'
import SendJob from '../SendJob'
import { EncodedJob } from '../../queue'

export default class EmailJob extends SendJob {
    static $name = 'email'

    static from(data: MessageTrigger): EmailJob {
        return new this(data)
    }

    static async handler(trigger: MessageTrigger, raw: EncodedJob) {
        const data = await loadSendJob<EmailTemplate>(trigger)
        if (!data) return

        const { campaign, template, user, project, event, context } = data

        // Send and render email
        const channel = await loadEmailChannel(campaign.provider_id, project.id)
        if (!channel) {
            await updateSendState(campaign, user, 'failed')
            return
        }

        // Check current send rate, if exceeded then requeue job
        // at a time in the future
        const rateCheck = await this.throttle(channel)
        if (rateCheck?.exceeded) {
            await this.requeue(raw, rateCheck.msRemaining)
            return
        }

        await channel.send(template, { user, event, context })

        // Update send record
        await updateSendState(campaign, user)

        // Create an event on the user about the email
        await createEvent(user, {
            name: 'email_sent',
            data: context,
        })
    }
}
