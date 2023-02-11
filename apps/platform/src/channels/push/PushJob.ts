import { Job } from '../../queue'
import { PushTemplate } from '../../render/Template'
import { createEvent } from '../../users/UserEventRepository'
import { MessageTrigger } from '../MessageTrigger'
import PushError from './PushError'
import { disableNotifications } from '../../users/UserRepository'
import { updateSendState } from '../../campaigns/CampaignService'
import { loadSendJob } from '../MessageTriggerService'
import { loadPushChannel } from '.'

export default class PushJob extends Job {
    static $name = 'push'

    static from(data: MessageTrigger): PushJob {
        return new this(data)
    }

    static async handler(trigger: MessageTrigger) {
        const data = await loadSendJob<PushTemplate>(trigger)
        if (!data) return

        const { campaign, template, user, project, event } = data
        const context = {
            campaign_id: campaign?.id,
            template_id: template?.id,
        }

        try {
            // Send and render push
            const channel = await loadPushChannel(campaign.provider_id, project.id)
            if (!channel) {
                await updateSendState(campaign, user, 'failed')
                return
            }
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
