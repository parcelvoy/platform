import { Job } from '../queue'
import Campaign from './Campaign'
import CampaignGenerateListJob from './CampaignGenerateListJob'
import CampaignEnqueueSendsJob from './CampaignEnqueueSendsJob'

export default class ProcessCampaignsJob extends Job {
    static $name = 'process_campaigns_job'

    static async handler() {

        const campaigns = await Campaign.query()
            .whereIn('state', ['loading', 'scheduled', 'running'])
            .whereNotNull('send_at')
            .whereNull('deleted_at')
            .where('type', 'blast') as Campaign[]
        for (const campaign of campaigns) {

            // When in loading state we need to regenerate send list
            if (campaign.state === 'loading') {
                await CampaignGenerateListJob.from(campaign).queue()
            }

            // Start looking through messages that are ready to send
            await CampaignEnqueueSendsJob.from(campaign).queue()
        }
    }
}
