import { Job } from '../queue'
import Campaign from './Campaign'
import { campaignProgress, updateCampaignProgress } from './CampaignService'

export default class CampaignStateJob extends Job {
    static $name = 'campaign_state_job'

    static async handler() {
        const campaigns = await Campaign.query()
            .whereIn('state', ['running'])
        for (const campaign of campaigns) {
            const progress = await campaignProgress(campaign)
            await updateCampaignProgress(campaign.id, campaign.project_id, 'finished', progress)
        }
    }
}
