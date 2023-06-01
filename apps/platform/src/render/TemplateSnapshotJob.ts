import Campaign from '../campaigns/Campaign'
import { getProject } from '../projects/ProjectService'
import { Job } from '../queue'
import Template from './Template'
import { screenshotTemplate, templateInUserLocale } from './TemplateService'

interface CampaignSnapshotParams {
    campaign_id: number
    project_id: number
}

export default class CampaignSnapshotJob extends Job {
    static $name = 'campaign_snapshot_job'

    static from(params: CampaignSnapshotParams): CampaignSnapshotJob {
        return new this(params)
    }

    static async handler({ campaign_id, project_id }: CampaignSnapshotParams) {
        const project = await getProject(project_id)
        if (!project) return

        const templates = await Template.all(
            qb => qb.where('campaign_id', campaign_id),
        )

        // Only screenshot email templates
        const template = templateInUserLocale(templates, project).map()
        if (template.type === 'email') {
            await screenshotTemplate(template, Campaign.screenshotPath(campaign_id))
        }
    }
}
