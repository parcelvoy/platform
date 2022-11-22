import { Job } from '../queue'
import { getTemplate, screenshotTemplate } from './TemplateService'

interface TemplateSnapshotParams {
    template_id: number
    project_id: number
}

export default class TemplateSnapshotJob extends Job {
    static $name = 'template_snapshot_job'

    static from(params: TemplateSnapshotParams): TemplateSnapshotJob {
        return new this(params)
    }

    static async handler({ template_id, project_id }: TemplateSnapshotParams) {
        const template = await getTemplate(template_id, project_id)
        if (!template) return

        await screenshotTemplate(template.map())
    }
}
