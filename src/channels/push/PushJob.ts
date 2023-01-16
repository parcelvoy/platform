import { Job } from '../../queue'
import { User } from '../../users/User'
import { UserEvent } from '../../users/UserEvent'
import { PushTemplate } from '../../render/Template'
import { createEvent } from '../../users/UserEventRepository'
import { MessageTrigger } from '../MessageTrigger'
import { loadChannel } from '../../config/channels'
import Campaign from '../../campaigns/Campaign'
import PushError from './PushError'
import { disableNotifications } from '../../users/UserRepository'
import { updateSendState } from '../../campaigns/CampaignService'
import Project from '../../projects/Project'

export default class PushJob extends Job {
    static $name = 'push'

    static from(data: MessageTrigger): PushJob {
        return new this(data)
    }

    static async handler({ campaign_id, user_id, event_id }: MessageTrigger) {

        // Pull user & event details
        const user = await User.find(user_id)
        const event = await UserEvent.find(event_id)
        const campaign = await Campaign.find(campaign_id)
        const project = await Project.find(campaign?.project_id)

        // If user or campaign has been deleted since, abort
        if (!user || !campaign || !project) return

        const template = await PushTemplate.first(
            qb => qb.where('campaign_id', campaign.id).where('locale', user.locale),
        )

        // If not available template, abort
        if (!template) return

        const context = {
            campaign_id: campaign?.id,
            template_id: template?.id,
        }

        try {
            // Send and render push
            const channel = await loadChannel(user.project_id, 'push')
            await channel.send(template, { user, event, context })

            // Update send record
            await updateSendState(campaign, user)

            // Create an event on the user about the push
            await createEvent({
                project_id: user.project_id,
                user_id: user.id,
                name: 'push_sent',
                data: context,
            })

        } catch (error) {
            if (error instanceof PushError) {

                // If the push is unable to send, find invalidated tokens
                // and disable those devices
                await disableNotifications(user.id, error.invalidTokens)

                // Update send record
                await updateSendState(campaign, user, 'failed')

                // Create an event about the disabling
                await createEvent({
                    project_id: user.project_id,
                    user_id: user.id,
                    name: 'notifications_disabled',
                    data: {
                        ...context,
                        tokens: error.invalidTokens,
                    },
                })
            }
        }
    }
}
