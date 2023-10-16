import { subDays } from 'date-fns'
import { Job } from '../queue'
import Campaign from './Campaign'
import { updateCampaignProgress } from './CampaignService'

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

        for (const campaign of campaigns) {
            await updateCampaignProgress(campaign)
        }
    }
}
