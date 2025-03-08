import App from '../app'
import { Job } from '../queue'
import { unsubscribe } from '../subscriptions/SubscriptionService'
import { CampaignSend } from './Campaign'
import { CacheKeys, getCampaignSend, updateCampaignSend } from './CampaignService'

interface CampaignIteraction {
    user_id: number
    campaign_id: number
    reference_id: string
    subscription_id?: number
    type: 'clicked' | 'opened' | 'bounced' | 'complained' | 'failed'
    action?: 'unsubscribe'
}

export default class CampaignInteractJob extends Job {
    static $name = 'campaign_interact_job'

    static from(data: CampaignIteraction): CampaignInteractJob {
        return new this(data)
    }

    static async handler({ campaign_id, user_id, subscription_id, type, action, reference_id }: CampaignIteraction) {
        const send = await getCampaignSend(campaign_id, user_id, reference_id)
        if (!send) return

        if (type === 'opened' && !send.opened_at) {
            await updateCampaignSend(campaign_id, user_id, reference_id, { opened_at: new Date() })
            await App.main.redis.sadd(CacheKeys.pendingStats, campaign_id)
        }

        if (type === 'clicked') {
            const updates: Partial<CampaignSend> = { clicks: ++send.clicks }
            if (!send.opened_at) {
                updates.opened_at = new Date()
            }
            await updateCampaignSend(campaign_id, user_id, reference_id, updates)
        }

        if (type === 'complained' || type === 'bounced') {
            await updateCampaignSend(campaign_id, user_id, reference_id, { state: 'bounced' })
        }

        if (subscription_id && action === 'unsubscribe') {
            await unsubscribe(user_id, subscription_id)
        }
    }
}
