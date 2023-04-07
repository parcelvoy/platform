import { Job } from '../queue'
import { unsubscribe } from '../subscriptions/SubscriptionService'
import { CampaignSend } from './Campaign'
import { getCampaignSend, updateCampaignSend } from './CampaignService'

interface CampaignIteraction {
    user_id: number
    campaign_id: number
    subscription_id?: number
    interaction: 'clicked' | 'opened' | 'bounced' | 'complained'
}

export default class CampaignInteractJob extends Job {
    static $name = 'campaign_interact_job'

    static from(data: CampaignIteraction): CampaignInteractJob {
        return new this(data)
    }

    static async handler({ campaign_id, user_id, subscription_id, interaction }: CampaignIteraction) {
        const send = await getCampaignSend(campaign_id, user_id)
        if (!send) return

        if (interaction === 'opened' && !send.opened_at) {
            await updateCampaignSend(send.id, { opened_at: new Date() })
        }

        if (interaction === 'clicked') {
            const updates: Partial<CampaignSend> = { clicks: ++send.clicks }
            if (!send.opened_at) {
                updates.opened_at = new Date()
            }
            await updateCampaignSend(send.id, updates)
        }

        if (subscription_id && (interaction === 'bounced' || interaction === 'complained')) {
            await unsubscribe(user_id, subscription_id)
        }
    }
}
