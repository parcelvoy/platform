import Job, { EncodedJob } from '../../queue/Job'
import { TextTemplate } from '../../render/Template'
import { createEvent } from '../../users/UserEventRepository'
import { MessageTrigger } from '../MessageTrigger'
import { updateSendState } from '../../campaigns/CampaignService'
import { loadSendJob, requeueSend, throttleSend } from '../MessageTriggerService'
import { loadTextChannel } from '.'

export default class TextJob extends Job {
    static $name = 'text'

    static from(data: MessageTrigger): TextJob {
        return new this(data)
    }

    static async handler(trigger: MessageTrigger, raw: EncodedJob) {

        const data = await loadSendJob<TextTemplate>(trigger)
        if (!data) return

        const { campaign, template, user, project, event, context } = data

        // Send and render text
        const channel = await loadTextChannel(campaign.provider_id, project.id)
        if (!channel) {
            await updateSendState(campaign, user, 'failed')
            return
        }

        // Check current send rate, if exceeded then requeue job
        // at a time in the future
        const rateCheck = await throttleSend(channel)
        if (rateCheck?.exceeded) {

            // Mark state as throttled so it is not continuously added
            // to the queue
            await updateSendState(campaign, user, 'throttled')

            // Schedule the resend for after the throttle finishes
            await requeueSend(raw, rateCheck.msRemaining)
            return
        }

        await channel.send(template, { user, event, context })

        // Update send record
        await updateSendState(campaign, user)

        // Create an event on the user about the text
        await createEvent(user, {
            name: 'text_sent',
            data: context,
        })
    }
}
