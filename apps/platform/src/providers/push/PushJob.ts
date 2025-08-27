import { loadPushChannel } from '.'
import { updateSendState } from '../../campaigns/CampaignService'
import { releaseLock } from '../../core/Lock'
import { EventPostJob } from '../../jobs'
import { EncodedJob, Job } from '../../queue'
import { PushTemplate } from '../../render/Template'
import { getPushDevicesForUser } from '../../users/DeviceRepository'
import { disableNotifications } from '../../users/UserRepository'
import { MessageTrigger } from '../MessageTrigger'
import { failSend, finalizeSend, loadSendJob, messageLock, prepareSend } from '../MessageTriggerService'
import PushError from './PushError'

export default class PushJob extends Job {
    static $name = 'push'

    static from(data: MessageTrigger): PushJob {
        return new this(data)
    }

    static async handler(trigger: MessageTrigger, raw: EncodedJob) {
        const data = await loadSendJob<PushTemplate>(trigger)
        if (!data) return

        const { campaign, template, user, project, context } = data
        const devices = await getPushDevicesForUser(project.id, user.id)

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

        try {
            // Send the push and update the send record
            const result = await channel.send(template, devices, data)
            await finalizeSend(data, result)

            // A user may have multiple devices some of which
            // may have failed even though the push was
            // successful. We need to check for those and
            // disable them
            if (result.invalidTokens.length) await disableNotifications(user, result.invalidTokens)
        } catch (error: any) {
            await failSend(data, error, (error: any) => !(error instanceof PushError))

            if (error instanceof PushError) {

                // If the push is unable to send, find invalidated tokens
                // and disable those devices
                await disableNotifications(user, error.invalidTokens)

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
            }
        } finally {
            await releaseLock(messageLock(campaign, user))
        }
    }
}
