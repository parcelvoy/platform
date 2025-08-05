import { Job } from '../queue'
import Campaign from './Campaign'
import CampaignGenerateListJob from './CampaignGenerateListJob'
import CampaignEnqueueSendsJob from './CampaignEnqueueSendsJob'
import { failStalledSends } from './CampaignService'

export default class CampaignProcessGenerationJob extends Job {
    static $name = 'campaign_process_generation_job'

    static from(): CampaignProcessGenerationJob {
        return new this().deduplicationKey(this.$name)
    }

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

        // Look for items that have stalled out and mark them as failed
        await failStalledSends()
    }
}
