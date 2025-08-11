import { Job } from '../queue'
import { providerSendReadyQuery, sendCampaignJob } from './CampaignService'
import { chunk } from '../utilities'
import App from '../app'
import { getProvider } from '../providers/ProviderRepository'
import { ChannelType } from '../config/channels'
import { cacheIncr } from '../config/redis'
import { sendsAvailable } from '../providers/ProviderService'
import Provider from '../providers/Provider'

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
        // this job runs (every 15 seconds)
        const provider = await getProvider(provider_id)
        if (!provider) return

        const available = sendsAvailable(provider)

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
        await cacheIncr(Provider.cacheKey.consumed(provider.id), count, 15)
    }
}
