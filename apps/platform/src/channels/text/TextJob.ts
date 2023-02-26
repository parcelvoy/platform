import { Job } from '../../queue'
import { TextTemplate } from '../../render/Template'
import { createEvent } from '../../users/UserEventRepository'
import { MessageTrigger } from '../MessageTrigger'
import { updateSendState } from '../../campaigns/CampaignService'
import { loadSendJob } from '../MessageTriggerService'
import { loadTextChannel } from '.'

export default class TextJob extends Job {
    static $name = 'text'

    static from(data: MessageTrigger): TextJob {
        return new this(data)
    }

    static async handler(trigger: MessageTrigger) {

        const data = await loadSendJob<TextTemplate>(trigger)
        if (!data) return

        const { campaign, template, user, project, event } = data
        const context = {
            campaign_id: campaign?.id,
            template_id: template?.id,
        }

        // Send and render text
        const channel = await loadTextChannel(campaign.provider_id, project.id)
        if (!channel) {
            await updateSendState(campaign, user, 'failed')
            return
        }
        await channel.send(template, { user, event, context })

        // Update send record
        await updateSendState(campaign, user)

        // Create an event on the user about the text
        createEvent({
            project_id: user.project_id,
            user_id: user.id,
            name: 'text_sent',
            data: context,
        })
    }
}
