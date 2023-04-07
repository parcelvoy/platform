import { Job } from '../queue'
import Campaign from './Campaign'
import { campaignProgress, updateCampaignProgress } from './CampaignService'

export default class CampaignStateJob extends Job {
    static $name = 'campaign_state_job'

    static async handler() {
        const campaigns = await Campaign.query()
            .whereIn('state', ['running', 'finished'])
        for (const campaign of campaigns) {
            const { sent, pending, total, opens, clicks } = await campaignProgress(campaign)
            await updateCampaignProgress(campaign.id, campaign.project_id, pending <= 0 ? 'finished' : campaign.state, { sent, total, opens, clicks })
        }
    }
}
