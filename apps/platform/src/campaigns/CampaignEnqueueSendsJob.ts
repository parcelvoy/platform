import { Job } from '../queue'
import { campaignSendReadyQuery, failStalledSends, getCampaign, sendCampaignJob } from './CampaignService'
import { CampaignJobParams } from './Campaign'
import { chunk } from '../utilities'
import App from '../app'
import { acquireLock, releaseLock } from '../core/Lock'
import { getProvider } from '../providers/ProviderRepository'

export default class CampaignEnqueueSendsJob extends Job {
    static $name = 'campaign_enqueue_sends_job'

    static from(data: CampaignJobParams): CampaignEnqueueSendsJob {
        return new this(data)
    }

    static async handler({ id, project_id }: CampaignJobParams) {
        const campaign = await getCampaign(id, project_id)
        if (!campaign) return

        const key = `campaign_send_${campaign.id}`
        const acquired = await acquireLock({ key, timeout: 300 })
        if (!acquired) return

        // If we are using redis, we can include throttled sends
        // because they are deduped based on jobId. Not available in other
        // queues
        const includeThrottled = App.main.env.queue.driver === 'redis'

        // Only enqueue the maximum that can be sent for the interval
        // this job runs (every minute)
        const provider = await getProvider(campaign.provider_id)
        const ratePerMinute = provider?.ratePer('minute')

        // Anything that is ready to be sent, enqueue for sending
        const query = campaignSendReadyQuery(campaign.id, includeThrottled, ratePerMinute)
        await chunk<{ user_id: number, reference_id?: string }>(query, 100, async (items) => {
            const jobs = items.map(({ user_id, reference_id }) => sendCampaignJob({ campaign, user: user_id, reference_id }))
            await App.main.queue.enqueueBatch(jobs)
        })

        // Look for items that have stalled out and mark them as failed
        await failStalledSends(campaign)

        await releaseLock(key)
    }
}
