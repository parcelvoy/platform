import { EncodedJob, Job } from '../../queue'
import { MessageTrigger } from '../MessageTrigger'
import { WebhookTemplate } from '../../render/Template'
import { createEvent } from '../../users/UserEventRepository'
import { updateSendState } from '../../campaigns/CampaignService'
import { loadSendJob, messageLock, prepareSend } from '../MessageTriggerService'
import { loadWebhookChannel } from '.'
import { releaseLock } from '../../config/scheduler'

export default class WebhookJob extends Job {
    static $name = 'webhook'

    static from(data: MessageTrigger): WebhookJob {
        return new this(data)
    }

    static async handler(trigger: MessageTrigger, raw: EncodedJob) {
        const data = await loadSendJob<WebhookTemplate>(trigger)
        if (!data) return

        const { campaign, template, user, project, event, context } = data

        // Send and render webhook
        const channel = await loadWebhookChannel(campaign.provider_id, project.id)
        if (!channel) {
            await updateSendState(campaign, user, 'aborted')
            return
        }

        // Check current send rate and if the send is locked
        const isReady = await prepareSend(channel, data, raw)
        if (!isReady) return

        await channel.send(template, { user, event, context })

        // Update send record
        await updateSendState(campaign, user)

        // Create an event on the user about the email
        await createEvent(user, {
            name: campaign.eventName('sent'),
            data: context,
        })

        await releaseLock(messageLock(campaign, user))
    }
}
