import { Job } from '../queue'
import { campaignSendReadyQuery, getCampaign, sendCampaignJob } from './CampaignService'
import { CampaignJobParams } from './Campaign'
import { chunk } from '../utilities'
import App from '../app'

export default class CampaignSendJob extends Job {
    static $name = 'campaign_send_job'

    static from(data: CampaignJobParams): CampaignSendJob {
        return new this(data)
    }

    static async handler({ id, project_id }: CampaignJobParams) {
        const campaign = await getCampaign(id, project_id)
        if (!campaign) return

        const query = campaignSendReadyQuery(campaign.id)
        await chunk<{ user_id: number, send_id: number }>(query, 100, async (items) => {
            const jobs = items.map(({ user_id, send_id }) => sendCampaignJob({ campaign, user: user_id, send_id }))
            await App.main.queue.enqueueBatch(jobs)
        })
    }
}
