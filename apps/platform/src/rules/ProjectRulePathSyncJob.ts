import Project from '../projects/Project'
import { Job } from '../queue'
import { syncProjectRulePaths } from './ProjectRulePathService'

interface ProjectRulePathSyncTrigger {
    project_id?: number
    delta?: Date
}

export default class ProjectRulePathSyncJob extends Job {
    static $name = 'project_rule_path_sync'

    static from(data: ProjectRulePathSyncTrigger): ProjectRulePathSyncJob {
        return new this(data)
    }

    static async handler({ delta, project_id }: ProjectRulePathSyncTrigger) {

        if (delta && !(delta instanceof Date)) {
            delta = new Date(delta)
        }

        // specific project only, or all projects
        const projectIds: number[] = project_id
            ? [project_id]
            : await Project.query().select('id').then(rs => rs.map((r: any) => r.id))

        console.log('projectIds', projectIds)

        for (const project_id of projectIds) {
            await syncProjectRulePaths({
                project_id,
                delta,
            })
        }
    }

}
