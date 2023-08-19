import { subDays } from 'date-fns'
import { Job } from '../queue'
import { shallowEqual } from '../utilities'
import Campaign, { CampaignDelivery } from './Campaign'
import { campaignProgress, updateCampaignProgress } from './CampaignService'

export default class CampaignStateJob extends Job {
    static $name = 'campaign_state_job'

    static async handler() {

        // Fetch anything that is currently running or has finished
        // within the last two days
        const campaigns = await Campaign.query()
            .whereIn('state', ['scheduled', 'running'])
            .orWhere(function(qb) {
                qb.where('state', 'finished')
                    .where('send_at', '>', subDays(Date.now(), 2))
            })

        const currentState = (campaign: Campaign, pending: number, delivery: CampaignDelivery) => {
            if (campaign.type === 'trigger') return 'running'
            if (pending <= 0) return 'finished'
            if (delivery.sent === 0) return 'scheduled'
            return 'running'
        }

        for (const campaign of campaigns) {
            const { pending, ...delivery } = await campaignProgress(campaign)
            const state = currentState(campaign, pending, delivery)

            // If nothing has changed, continue otherwise update
            if (shallowEqual(campaign.delivery, delivery) && state === campaign.state) continue
            await updateCampaignProgress(campaign.id, campaign.project_id, state, delivery)
        }
    }
}
