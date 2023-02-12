import { Job } from '../../queue'
import { MessageTrigger } from '../MessageTrigger'
import { WebhookTemplate } from '../../render/Template'
import { createEvent } from '../../users/UserEventRepository'
import { updateSendState } from '../../campaigns/CampaignService'
import { loadSendJob } from '../MessageTriggerService'
import { loadWebhookChannel } from '.'

export default class WebhookJob extends Job {
    static $name = 'webhook'

    static from(data: MessageTrigger): WebhookJob {
        return new this(data)
    }

    static async handler(trigger: MessageTrigger) {
        const data = await loadSendJob<WebhookTemplate>(trigger)
        if (!data) return

        const { campaign, template, user, project, event } = data
        const context = {
            campaign_id: campaign?.id,
            template_id: template?.id,
        }

        // Send and render webhook
        const channel = await loadWebhookChannel(campaign.provider_id, project.id)
        if (!channel) {
            await updateSendState(campaign, user, 'failed')
            return
        }
        await channel.send(template, { user, event, context })

        // Update send record
        await updateSendState(campaign, user)

        // Create an event on the user about the email
        createEvent({
            project_id: user.project_id,
            user_id: user.id,
            name: 'webhook_sent',
            data: context,
        })
    }
}
