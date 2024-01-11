import { loadInAppChannel } from '.'
import { updateSendState } from '../../campaigns/CampaignService'
import { releaseLock } from '../../config/scheduler'
import Job, { EncodedJob } from '../../queue/Job'
import { createEvent } from '../../users/UserEventRepository'
import { MessageTrigger } from '../MessageTrigger'
import { loadSendJob, messageLock, notifyJourney, prepareSend } from '../MessageTriggerService'

export default class InAppJob extends Job {
    static $name = 'in_app_job'

    static from(data: MessageTrigger): InAppJob {
        return new this(data)
    }

    static async handler(trigger: MessageTrigger, raw: EncodedJob) {

        const data = await loadSendJob<TextTemplate>(trigger)
        if (!data) return

        const { campaign, template, user, context } = data
        const channel = await loadInAppChannel()
        const isReady = await prepareSend(channel, data, raw)
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
