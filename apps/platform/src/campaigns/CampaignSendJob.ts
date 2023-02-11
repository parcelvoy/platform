import App from '../app'
import { Job } from '../queue'
import CampaignStateJob from './CampaignStateJob'
import { campaignSendReadyQuery, sendCampaign } from './CampaignService'

export default class CampaignSendJob extends Job {
    static $name = 'campaign_send_job'

    static async handler() {
        await campaignSendReadyQuery()
            .stream(async function(stream) {
                for await (const { user_id, ...campaign } of stream) {
                    await sendCampaign(campaign, user_id)
                }
            })
            .then(() => {
                App.main.queue.enqueue(CampaignStateJob.from())
            })
    }
}
