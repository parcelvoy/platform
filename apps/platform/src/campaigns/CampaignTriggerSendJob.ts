import { Job } from '../queue'
import { CampaignSend } from './Campaign'
import UserDeviceJob from '../users/UserDeviceJob'
import EventPostJob from '../client/EventPostJob'
import { uuid } from '../utilities'
import { getCampaign, sendCampaignJob } from './CampaignService'
import { User } from '../users/User'
import { UserEvent } from '../users/UserEvent'

export interface CampaignTriggerSendParams {
    project_id: number
    campaign_id: number
    user: Pick<User, 'email' | 'phone' | 'timezone' | 'locale'> & { external_id: string, device_token?: string }
    event: Record<string, any>
}

export default class CampaignTriggerSendJob extends Job {
    static $name = 'campaign_trigger_send_job'

    static from(data: CampaignTriggerSendParams): CampaignTriggerSendJob {
        return new this(data)
    }

    static async handler({ project_id, campaign_id, user, event }: CampaignTriggerSendParams) {

        const { external_id, email, phone, device_token, locale, timezone, ...data } = user
        const { user: { id: userId }, event: { id: eventId } } = await EventPostJob.from({
            project_id,
            event: {
                name: 'trigger',
                external_id: user.external_id,
                data: event,
                user: { external_id, email, phone, data, locale, timezone },
            },
        }).handle<{ user: User, event: UserEvent }>()

        if (device_token) {
            await UserDeviceJob.from({
                project_id,
                external_id,
                token: device_token,
                device_id: device_token,
            }).handle()
        }

        const campaign = await getCampaign(campaign_id, project_id)
        if (!campaign) return
        const reference_id = uuid()
        const send_id = await CampaignSend.insert({
            campaign_id,
            user_id: userId,
            state: 'pending',
            send_at: new Date(),
            reference_type: 'trigger',
            reference_id,
        })

        await sendCampaignJob({ campaign, user: userId, send_id, reference_id, event: eventId }).queue()

    }
}
