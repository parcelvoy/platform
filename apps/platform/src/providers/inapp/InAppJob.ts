import { loadInAppChannel } from '.'
import { releaseLock } from '../../config/scheduler'
import Job, { EncodedJob } from '../../queue/Job'
import { InAppTemplate } from '../../render/Template'
import { MessageTrigger } from '../MessageTrigger'
import { failSend, finalizeSend, loadSendJob, messageLock, prepareSend } from '../MessageTriggerService'

export default class InAppJob extends Job {
    static $name = 'in_app_job'

    static from(data: MessageTrigger): InAppJob {
        return new this(data)
    }

    static async handler(trigger: MessageTrigger, raw: EncodedJob) {

        const data = await loadSendJob<InAppTemplate>(trigger)
        if (!data) return

        const { campaign, template, user } = data
        const channel = await loadInAppChannel()
        const isReady = await prepareSend(channel, data, raw)
        if (!isReady) return

        try {
            const result = await channel.send(template, data)
            await finalizeSend(data, result)
        } catch (error: any) {
            await failSend(data, error)
        } finally {
            await releaseLock(messageLock(campaign, user))
        }
    }
}
