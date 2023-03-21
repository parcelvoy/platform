import App from '../app'
import { Job } from '../queue'
import CampaignStateJob from './CampaignStateJob'
import { campaignSendReadyQuery, getCampaign, sendCampaign } from './CampaignService'
import { CampaignJobParams } from './Campaign'

export default class CampaignSendJob extends Job {
    static $name = 'campaign_send_job'

    static from(data: CampaignJobParams): CampaignSendJob {
        return new this(data)
    }

    static async handler({ id, project_id }: CampaignJobParams) {
        const campaign = await getCampaign(id, project_id)
        if (!campaign) return

        await campaignSendReadyQuery(campaign.id)
            .stream(async function(stream) {
                for await (const { user_id } of stream) {
                    await sendCampaign(campaign, user_id)
                }
            })
            .then(() => {
                App.main.queue.enqueue(CampaignStateJob.from())
            })
    }
}
