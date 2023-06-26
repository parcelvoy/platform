import Job, { EncodedJob } from '../../queue/Job'
import { TextTemplate } from '../../render/Template'
import { createEvent } from '../../users/UserEventRepository'
import { MessageTrigger } from '../MessageTrigger'
import { updateSendState } from '../../campaigns/CampaignService'
import { loadSendJob, prepareSend } from '../MessageTriggerService'
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

        // Check current send rate and if the send is locked
        const isReady = prepareSend(channel, data, raw)
        if (!isReady) return

        await channel.send(template, { user, event, context })

        // Update send record
        await updateSendState(campaign, user)

        // Create an event on the user about the text
        await createEvent(user, {
            name: campaign.eventName('sent'),
            data: context,
        })
    }
}
