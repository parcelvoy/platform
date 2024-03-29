import Job from '../../queue/Job'
import { MessageTrigger } from '../MessageTrigger'
import { updateSendState } from '../../campaigns/CampaignService'
import { loadEmailChannel } from './index'
import { failSend, finalizeSend, loadSendJob, messageLock, prepareSend } from '../MessageTriggerService'
import { EmailTemplate } from '../../render/Template'
import { EncodedJob } from '../../queue'
import App from '../../app'
import { releaseLock } from '../../core/Lock'

export default class EmailJob extends Job {
    static $name = 'email'

    static from(data: MessageTrigger): EmailJob {
        return new this(data)
    }

    static async handler(trigger: MessageTrigger, raw: EncodedJob) {
        const data = await loadSendJob<EmailTemplate>(trigger)
        if (!data) return

        const { campaign, template, user, project } = data

        // Load email channel so its ready to send
        const channel = await loadEmailChannel(campaign.provider_id, project.id)
        if (!channel) {
            await updateSendState({
                campaign,
                user,
                reference_id: trigger.reference_id,
                state: 'aborted',
            })
            App.main.error.notify(new Error('Unabled to send when there is no channel available.'))
            return
        }

        // Check current send rate and if the send is locked
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
