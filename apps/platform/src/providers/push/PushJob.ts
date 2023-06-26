import { Job } from '../../queue'
import { PushTemplate } from '../../render/Template'
import { createEvent } from '../../users/UserEventRepository'
import { MessageTrigger } from '../MessageTrigger'
import PushError from './PushError'
import { disableNotifications } from '../../users/UserRepository'
import { updateSendState } from '../../campaigns/CampaignService'
import { loadSendJob } from '../MessageTriggerService'
import { loadPushChannel } from '.'
import App from '../../app'

export default class PushJob extends Job {
    static $name = 'push'

    static from(data: MessageTrigger): PushJob {
        return new this(data)
    }

    static async handler(trigger: MessageTrigger) {
        const data = await loadSendJob<PushTemplate>(trigger)
        if (!data) return

        const { campaign, template, user, project, event, context } = data

        try {
            // Load email channel so its ready to send
            const channel = await loadPushChannel(campaign.provider_id, project.id)
            if (!channel) {
                await updateSendState(campaign, user, 'failed')
                return
            }

            // Lock the send record to prevent duplicate sends
            await updateSendState(campaign, user, 'locked')

            // Send the push and update the send record
            await channel.send(template, { user, event, context })
            await updateSendState(campaign, user)

            // Create an event on the user about the push
            await createEvent(user, {
                name: campaign.eventName('sent'),
                data: context,
            })

        } catch (error: any) {
            if (error instanceof PushError) {

                // If the push is unable to send, find invalidated tokens
                // and disable those devices
                await disableNotifications(user.id, error.invalidTokens)

                // Update send record
                await updateSendState(campaign, user, 'failed')

                // Create an event about the disabling
                await createEvent(user, {
                    name: 'notifications_disabled',
                    data: {
                        ...context,
                        tokens: error.invalidTokens,
                    },
                })
            } else {
                App.main.error.notify(error)
            }
        }
    }
}
