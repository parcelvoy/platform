import Job, { EncodedJob } from '../../queue/Job'
import { TextTemplate } from '../../render/Template'
import { MessageTrigger } from '../MessageTrigger'
import { updateSendState } from '../../campaigns/CampaignService'
import { failSend, finalizeSend, loadSendJob, messageLock, prepareSend } from '../MessageTriggerService'
import { loadTextChannel } from '.'
import App from '../../app'
import { UndeliverableTextError, UnsubscribeTextError } from './TextError'
import { releaseLock } from '../../core/Lock'

export default class TextJob extends Job {
    static $name = 'text'

    static from(data: MessageTrigger): TextJob {
        return new this(data)
    }

    static async handler(trigger: MessageTrigger, raw: EncodedJob) {

        const data = await loadSendJob<TextTemplate>(trigger)
        if (!data) return

        const { campaign, template, user, project } = data

        // Send and render text
        const channel = await loadTextChannel(campaign.provider_id, project.id)
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
        // Increment rate limitter by number of segments
        const segments = await channel.segments(template, data)
        const isReady = await prepareSend(channel, data, raw, segments)
        if (!isReady) return

        try {
            const result = await channel.send(template, data)
            await finalizeSend(data, result)
        } catch (error: any) {
            await failSend(data, error, (error: any) => !(error instanceof UnsubscribeTextError || error instanceof UndeliverableTextError))
        } finally {
            await releaseLock(messageLock(campaign, user))
        }
    }
}
