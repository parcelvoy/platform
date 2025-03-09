import { Job } from '../queue'
import Campaign, { CampaignJobParams } from './Campaign'
import CampaignGenerateListJob from './CampaignGenerateListJob'
import { abortCampaign, getCampaign } from './CampaignService'

export interface CampaignAbortParams extends CampaignJobParams {
    reschedule?: boolean
}

export default class CampaignAbortJob extends Job {
    static $name = 'campaign_abort_job'

    static from({ id, project_id, reschedule }: CampaignAbortParams): CampaignAbortJob {
        return new this({ id, project_id, reschedule }).jobId(`cid_${id}_abort`)
    }

    static async handler({ id, project_id, reschedule }: CampaignAbortParams) {
        const campaign = await getCampaign(id, project_id)
        if (!campaign) return
        await abortCampaign(campaign)

        const state = reschedule ? 'loading' : 'aborted'

        await Campaign.update(qb => qb.where('id', id), {
            state,
        })

        if (state === 'loading' && campaign.type === 'blast') {
            await CampaignGenerateListJob.from(campaign).queue()
        }
    }
}
