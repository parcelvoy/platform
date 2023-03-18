import { Job } from '../queue'
import Campaign from './Campaign'
import { generateSendList } from './CampaignService'

export default class CampaignTriggerJob extends Job {
    static $name = 'campaign_trigger_job'

    static async handler() {
        const campaigns = await Campaign.query()
            .where('state', 'pending')
            .whereNotNull('send_at')
        for (const campaign of campaigns) {
            await generateSendList(campaign)
        }
    }
}
