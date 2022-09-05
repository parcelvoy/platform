import { Job } from '../../queue'
import { User } from '../../users/User'
import { MessageTrigger } from '../MessageTrigger'
import { WebhookTemplate } from '../../render/Template'
import { UserEvent } from '../../users/UserEvent'
import { createEvent } from '../../users/UserEventRepository'
import { loadChannel } from '../../config/channels'
import Campaign from '../../campaigns/Campaign'

export default class WebhookJob extends Job {
    static $name = 'webhook'

    static from(data: MessageTrigger): WebhookJob {
        return new this(data)
    }

    static async handler({ campaign_id, user_id, event_id }: MessageTrigger) {
        // Pull user & event details
        const user = await User.find(user_id)
        const event = await UserEvent.find(event_id)
        const campaign = await Campaign.find(campaign_id)
        const template = await WebhookTemplate.find(campaign?.id)

        // If user or template has been deleted since, abort
        if (!user || !template || !campaign) return

        const context = {
            campaign_id: campaign?.id,
            template_id: template?.id,
        }

        // Send and render webhook
        const channel = await loadChannel(user.project_id, 'webhook')
        await channel.send(template, { user, event, context })

        // Create an event on the user about the email
        createEvent({
            project_id: user.project_id,
            user_id: user.id,
            name: 'webhook_sent',
            data: context,
        })
    }
}
