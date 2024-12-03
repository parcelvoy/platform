import { EncodedJob, Job } from '../../queue'
import { PushTemplate } from '../../render/Template'
import { MessageTrigger } from '../MessageTrigger'
import PushError from './PushError'
import { disableNotifications } from '../../users/UserRepository'
import { updateSendState } from '../../campaigns/CampaignService'
import { finalizeSend, loadSendJob, messageLock, prepareSend } from '../MessageTriggerService'
import { loadPushChannel } from '.'
import App from '../../app'
import { releaseLock } from '../../core/Lock'
import { EventPostJob } from '../../jobs'

export default class PushJob extends Job {
    static $name = 'push'

    static from(data: MessageTrigger): PushJob {
        return new this(data)
    }

    static async handler(trigger: MessageTrigger, raw: EncodedJob) {
        const data = await loadSendJob<PushTemplate>(trigger)
        if (!data) return

        const { campaign, template, user, project, context } = data

        try {
            // Load email channel so its ready to send
            const channel = await loadPushChannel(campaign.provider_id, project.id)
            if (!channel) {
                await updateSendState({
                    campaign,
                    user,
                    reference_id: trigger.reference_id,
                    state: 'aborted',
                })
                return
            }

            // Check current send rate and if the send is locked
            const isReady = await prepareSend(channel, data, raw)
            if (!isReady) return

            // Send the push and update the send record
            const result = await channel.send(template, data)
            if (result) {
                await finalizeSend(data, result)

                // A user may have multiple devices some of which
                // may have failed even though the push was
                // successful. We need to check for those and
                // disable them
                if (result.invalidTokens.length) await disableNotifications(user.id, result.invalidTokens)
            }

        } catch (error: any) {
            if (error instanceof PushError) {

                // If the push is unable to send, find invalidated tokens
                // and disable those devices
                await disableNotifications(user.id, error.invalidTokens)

                // Update send record
                await updateSendState({
                    campaign,
                    user,
                    reference_id: trigger.reference_id,
                    state: 'failed',
                })

                // Create an event about the disabling
                await EventPostJob.from({
                    project_id: project.id,
                    user_id: user.id,
                    event: {
                        name: 'notifications_disabled',
                        external_id: user.external_id,
                        data: {
                            ...context,
                            tokens: error.invalidTokens,
                        },
                    },
                }).queue()
            } else {
                App.main.error.notify(error)
            }
        } finally {
            await releaseLock(messageLock(campaign, user))
        }
    }
}
