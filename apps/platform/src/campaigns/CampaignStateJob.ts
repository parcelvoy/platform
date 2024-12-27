import { subDays } from 'date-fns'
import { Job } from '../queue'
import Campaign from './Campaign'
import { CacheKeys, updateCampaignProgress } from './CampaignService'
import App from '../app'

export default class CampaignStateJob extends Job {
    static $name = 'campaign_state_job'

    static async handler() {

        // Fetch anything that is currently running or has finished
        // within the last two days or has activity
        const openedCampaignIds = await App.main.redis.smembers(CacheKeys.pendingStats)
        const campaigns = await Campaign.query()
            .whereIn('state', ['scheduled', 'running'])
            .orWhere(function(qb) {
                qb.where('state', 'finished')
                    .where('send_at', '>', subDays(Date.now(), 2))
            })
            .orWhereIn('id', openedCampaignIds.map(id => parseInt(id, 10))) as Campaign[]

        for (const campaign of campaigns) {
            await updateCampaignProgress(campaign)
        }

        await App.main.redis.srem(CacheKeys.pendingStats, ...campaigns.map(c => c.id))
    }
}
