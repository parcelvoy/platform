import { Job } from '../queue'
import CampaignEnqueueSendsJob from './CampaignEnqueueSendsJob'
import Provider from '../providers/Provider'

export default class CampaignProcessSendsJob extends Job {
    static $name = 'campaign_process_sends_job'

    static from(): CampaignProcessSendsJob {
        return new this().deduplicationKey(this.$name)
    }

    static async handler() {

        // For each provider, enqueue a job to load up all sends that are
        // possible within the given parameters of the provider
        const providers = await Provider.all(qb => qb.select('id'))
        for (const { id } of providers) {
            await CampaignEnqueueSendsJob.from({ provider_id: id }).queue()
        }
    }
}
