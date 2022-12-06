import { Job } from '../queue'
import Campaign from './Campaign'
import { sendList } from './CampaignService'

export default class CampaignTriggerJob extends Job {
    static $name = 'campaign_trigger_job'

    static async handler() {
        const campaigns = await Campaign.query()
            .where('state', 'ready')
            .whereNotNull('send_at')
            .where('send_at', '<', new Date())
        for (const campaign of campaigns) {
            await sendList(campaign)
        }
    }
}
