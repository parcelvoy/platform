import { EncodedJob, Job } from '../../queue'
import { MessageTrigger } from '../MessageTrigger'
import { WebhookTemplate } from '../../render/Template'
import { updateSendState } from '../../campaigns/CampaignService'
import { failSend, finalizeSend, loadSendJob, messageLock, prepareSend } from '../MessageTriggerService'
import { loadWebhookChannel } from '.'
import { releaseLock } from '../../core/Lock'

export default class WebhookJob extends Job {
    static $name = 'webhook'

    static from(data: MessageTrigger): WebhookJob {
        return new this(data)
    }

    static async handler(trigger: MessageTrigger, raw: EncodedJob) {
        const data = await loadSendJob<WebhookTemplate>(trigger)
        if (!data) return

        const { campaign, template, user, project } = data

        // Send and render webhook
        const channel = await loadWebhookChannel(campaign.provider_id, project.id)
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
            const result = await channel.send(template, data)
            await finalizeSend(data, result)
        } catch (error: any) {
            await failSend(data, error)
        } finally {
            await releaseLock(messageLock(campaign, user))
        }
    }
}
