import { loadInAppChannel } from '.'
import App from '../../app'
import { releaseLock } from '../../core/Lock'
import Job, { EncodedJob } from '../../queue/Job'
import { InAppTemplate } from '../../render/Template'
import { getPushDevicesForUser } from '../../users/DeviceRepository'
import { disableNotifications } from '../../users/UserRepository'
import { MessageTrigger } from '../MessageTrigger'
import { finalizeSend, loadSendJob, messageLock, prepareSend } from '../MessageTriggerService'
import PushError from '../push/PushError'
import PushJob from '../push/PushJob'

export default class InAppJob extends Job {
    static $name = 'in_app_job'

    static from(data: MessageTrigger): InAppJob {
        return new this(data)
    }

    static async handler(trigger: MessageTrigger, raw: EncodedJob) {

        const data = await loadSendJob<InAppTemplate>(trigger)
        if (!data) return

        const { campaign, template, user, project } = data
        const devices = await getPushDevicesForUser(project.id, user.id)

        try {
            // Load in-app channel so it's ready to send
            const channel = await loadInAppChannel()
            const isReady = await prepareSend(channel, data, raw)
            if (!isReady) return

            const result = await channel.send(template, devices, data)
            if (result) {
                await finalizeSend(data, result)

                // A user may have multiple devices some of which
                // may have failed even though the push was
                // successful. We need to check for those and
                // disable them
                if (result.invalidTokens.length) await disableNotifications(user, result.invalidTokens)
            }
            await finalizeSend(data, result)
        } catch (error: any) {
            error instanceof PushError
                ? await PushJob.handlePushFailed(error, trigger, data)
                : App.main.error.notify(error)
        } finally {
            await releaseLock(messageLock(campaign, user))
        }
    }
}
