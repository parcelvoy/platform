import { Job } from '../queue'
import Campaign from './Campaign'
import CampaignGenerateListJob from './CampaignGenerateListJob'
import CampaignSendJob from './CampaignSendJob'

export default class CampaignTriggerJob extends Job {
    static $name = 'campaign_trigger_job'

    static async handler() {

        const campaigns = await Campaign.query()
            .whereIn('state', ['pending', 'scheduled', 'running'])
            .whereNotNull('send_at')
        for (const campaign of campaigns) {

            // When pending we need to regenerate send list
            if (campaign.state === 'pending') {
                await CampaignGenerateListJob.from(campaign).queue()

            // Otherwise lets look through messages that are ready to send
            } else {
                await CampaignSendJob.from(campaign).queue()
            }
        }
    }
}
