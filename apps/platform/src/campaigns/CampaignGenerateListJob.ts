import { Job } from '../queue'
import { CampaignJobParams, SentCampaign } from './Campaign'
import { generateSendList, getCampaign } from './CampaignService'

export default class CampaignGenerateListJob extends Job {
    static $name = 'campaign_generate_list_job'

    static from(data: CampaignJobParams): CampaignGenerateListJob {
        return new this(data)
    }

    static async handler({ id, project_id }: CampaignJobParams) {
        const campaign = await getCampaign(id, project_id) as SentCampaign
        await generateSendList(campaign)
    }
}
