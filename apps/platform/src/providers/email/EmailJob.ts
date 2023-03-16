import { Job } from '../../queue'
import { createEvent } from '../../users/UserEventRepository'
import { MessageTrigger } from '../MessageTrigger'
import { updateSendState } from '../../campaigns/CampaignService'
import { loadEmailChannel } from '.'
import { loadSendJob } from '../MessageTriggerService'
import { EmailTemplate } from '../../render/Template'

export default class EmailJob extends Job {
    static $name = 'email'

    static from(data: MessageTrigger): EmailJob {
        return new this(data)
    }

    static async handler(trigger: MessageTrigger) {
        const data = await loadSendJob<EmailTemplate>(trigger)
        if (!data) return

        const { campaign, template, user, project, event } = data
        const context = {
            campaign_id: campaign?.id,
            template_id: template?.id,
        }

        // Send and render email
        const channel = await loadEmailChannel(campaign.provider_id, project.id)
        if (!channel) {
            await updateSendState(campaign, user, 'failed')
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
