import { Job } from '../queue'
import { providerSendReadyQuery, sendCampaignJob } from './CampaignService'
import { chunk } from '../utilities'
import App from '../app'
import { getProvider } from '../providers/ProviderRepository'
import { ChannelType } from '../config/channels'

type CampaignEnqueueSendsJobParams = {
    provider_id: number
}

type ProviderCampaignSendRecord = {
    user_id: number
    reference_id?: string
    campaign_id: number
    channel: ChannelType
}

export default class CampaignEnqueueSendsJob extends Job {
    static $name = 'campaign_enqueue_sends_job'

    static from(data: CampaignEnqueueSendsJobParams): CampaignEnqueueSendsJob {
        return new this(data).deduplicationKey(`${this.$name}_${data.provider_id}`)
    }

    static async handler({ provider_id }: CampaignEnqueueSendsJobParams) {

        // Only enqueue the maximum that can be sent for the interval
        // this job runs (every minute)
        const provider = await getProvider(provider_id)
        if (!provider) return
        const ratePerMinute = provider?.ratePer('minute')
        const ratePerSecond = provider?.ratePer('second')

        // Get the number of sends that have been sent this period
        // How often should we run this? Every ten seconds?

        // backlog = number of ones to still process, can be up to 2x rate limit
        // points = how many do we have left for the period

        // 10 left this second
        // 100 queued
        // time remaining? Does it matter?

        // If we add 600 to the queue and the rate limit is 10/sec
        // ten seconds later how many can we add?
        // the window has shifted by 10 seconds so we can add 100 more
        // we then need to set how many have been added to the queue
        // in the given window so that we can shift it appropriately

        const key = 'campaigns:provider:' + provider.id + ':rate_limit'
        const response = await App.main.redis
            .multi()
            .get(key)
            .ttl(key)
            .exec()
        const consumed = parseInt(response?.[0][1] as string) || 0
        const ttl = parseInt(response?.[1][1] as string) || 0

        const expired = (60 - ttl) * ratePerSecond
        const available = ratePerMinute - expired

        // Anything that is ready to be sent, enqueue for sending
        const query = providerSendReadyQuery(provider_id, available)
        let count = 0
        await chunk<ProviderCampaignSendRecord>(query, 100, async (items) => {
            const jobs = items.map(({ campaign_id, channel, user_id, reference_id }) => sendCampaignJob({
                campaign: { id: campaign_id, channel },
                user: user_id,
                reference_id,
            }))
            await App.main.queue.enqueueBatch(jobs)
            count += items.length
        })
        await App.main.redis.set(key, consumed + count, 'EX', 60)
    }
}
