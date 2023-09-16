import Job, { EncodedJob } from '../../queue/Job'
import { TextTemplate } from '../../render/Template'
import { createEvent } from '../../users/UserEventRepository'
import { MessageTrigger } from '../MessageTrigger'
import { updateSendState } from '../../campaigns/CampaignService'
import { loadSendJob, messageLock, notifyJourney, prepareSend } from '../MessageTriggerService'
import { loadTextChannel } from '.'
import { releaseLock } from '../../config/scheduler'
import App from '../../app'

export default class TextJob extends Job {
    static $name = 'text'

    static from(data: MessageTrigger): TextJob {
        return new this(data)
    }

    static async handler(trigger: MessageTrigger, raw: EncodedJob) {

        const data = await loadSendJob<TextTemplate>(trigger)
        if (!data) return

        const { campaign, template, user, project, context } = data

        // Send and render text
        const channel = await loadTextChannel(campaign.provider_id, project.id)
        if (!channel) {
            await updateSendState({
                campaign,
                user,
                user_step_id: trigger.user_step_id,
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
            await channel.send(template, data)
        } catch (error: any) {
            await updateSendState({
                campaign,
                user,
                user_step_id: trigger.user_step_id,
                state: 'failed',
            })
        }

        // Update send record
        await updateSendState({
            campaign,
            user,
            user_step_id: trigger.user_step_id,
        })

        // Create an event on the user about the text
        await createEvent(user, {
            name: campaign.eventName('sent'),
            data: context,
        })

        await releaseLock(messageLock(campaign, user))

        if (trigger.user_step_id) {
            await notifyJourney(trigger.user_step_id)
        }
    }
}
