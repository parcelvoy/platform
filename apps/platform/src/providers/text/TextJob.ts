import { TextTemplate } from '../../render/Template'
import { createEvent } from '../../users/UserEventRepository'
import { MessageTrigger } from '../MessageTrigger'
import { updateSendState } from '../../campaigns/CampaignService'
import { loadSendJob } from '../MessageTriggerService'
import { loadTextChannel } from '.'
import SendJob from '../SendJob'
import { EncodedJob } from '../../queue'

export default class TextJob extends SendJob {
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
        const rateCheck = await this.throttle(channel)
        if (rateCheck?.exceeded) {
            await this.requeue(raw, rateCheck.msRemaining)
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
