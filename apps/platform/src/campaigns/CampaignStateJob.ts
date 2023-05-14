import { Job } from '../queue'
import { shallowEqual } from '../utilities'
import Campaign from './Campaign'
import { campaignProgress, updateCampaignProgress } from './CampaignService'

export default class CampaignStateJob extends Job {
    static $name = 'campaign_state_job'

    static async handler() {
        const campaigns = await Campaign.query()
            .whereIn('state', ['scheduled', 'running', 'finished'])
        for (const campaign of campaigns) {
            const { pending, ...delivery } = await campaignProgress(campaign)
            const state = pending <= 0
                ? 'finished'
                : delivery.sent === 0 ? 'scheduled' : 'running'

            // If nothing has changed, continue otherwise update
            if (shallowEqual(campaign.delivery, delivery) && state === campaign.state) continue
            await updateCampaignProgress(campaign.id, campaign.project_id, state, delivery)
        }
    }
}
