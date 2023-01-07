import { Job } from '../../queue'
import { User } from '../../users/User'
import { UserEvent } from '../../users/UserEvent'
import { TextTemplate } from '../../render/Template'
import { createEvent } from '../../users/UserEventRepository'
import { MessageTrigger } from '../MessageTrigger'
import { loadChannel } from '../../config/channels'
import Campaign from '../../campaigns/Campaign'
import { updateSendState } from '../../campaigns/CampaignService'

export default class TextJob extends Job {
    static $name = 'text'

    static from(data: MessageTrigger): TextJob {
        return new this(data)
    }

    static async handler({ campaign_id, user_id, event_id }: MessageTrigger) {

        // Pull user & event details
        const user = await User.find(user_id)
        const event = await UserEvent.find(event_id)
        const campaign = await Campaign.find(campaign_id)
        const template = await TextTemplate.find(campaign?.template_id)

        // If user or template has been deleted since, abort
        if (!user || !template || !campaign) return

        const context = {
            campaign_id: campaign?.id,
            template_id: template?.id,
        }

        // Send and render text
        const channel = await loadChannel(user.project_id, 'text')
        await channel.send(template, { user, event, context })

        // Update send record
        await updateSendState(campaign, user)

        // Create an event on the user about the text
        createEvent({
            project_id: user.project_id,
            user_id: user.id,
            name: 'text_sent',
            data: context,
        })
    }
}
