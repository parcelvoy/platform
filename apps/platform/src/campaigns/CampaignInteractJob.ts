import { Job } from '../queue'
import { unsubscribe } from '../subscriptions/SubscriptionService'
import { CampaignSend } from './Campaign'
import { getCampaignSend, updateCampaignSend } from './CampaignService'

interface CampaignIteraction {
    user_id: number
    campaign_id: number
    user_step_id: number
    subscription_id?: number
    type: 'clicked' | 'opened' | 'bounced' | 'complained' | 'failed'
    action?: 'unsubscribe'
}

export default class CampaignInteractJob extends Job {
    static $name = 'campaign_interact_job'

    static from(data: CampaignIteraction): CampaignInteractJob {
        return new this(data)
    }

    static async handler({ campaign_id, user_id, subscription_id, type, action, user_step_id }: CampaignIteraction) {
        const send = await getCampaignSend(campaign_id, user_id, user_step_id)
        if (!send) return

        if (type === 'opened' && !send.opened_at) {
            await updateCampaignSend(send.id, { opened_at: new Date() })
        }

        if (type === 'clicked') {
            const updates: Partial<CampaignSend> = { clicks: ++send.clicks }
            if (!send.opened_at) {
                updates.opened_at = new Date()
            }
            await updateCampaignSend(send.id, updates)
        }

        if (type === 'complained' || type === 'bounced') {
            await updateCampaignSend(send.id, { state: 'bounced' })
        }

        if (subscription_id && action === 'unsubscribe') {
            await unsubscribe(user_id, subscription_id)
        }
    }
}
