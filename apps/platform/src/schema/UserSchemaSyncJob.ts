import Project from '../projects/Project'
import { Job } from '../queue'
import { syncUserDataPaths } from './UserSchemaService'

interface UserSchemaSyncTrigger {
    project_id?: number
    delta?: Date
}

export default class UserSchemaSyncJob extends Job {
    static $name = 'user_schema_sync'

    static from(data: UserSchemaSyncTrigger): UserSchemaSyncJob {
        return new this(data)
    }

    static async handler({ delta, project_id }: UserSchemaSyncTrigger) {

        if (delta && !(delta instanceof Date)) {
            delta = new Date(delta)
        }

        // specific project only, or all projects
        const projectIds: number[] = project_id
            ? [project_id]
            : await Project.query().select('id').then(rs => rs.map((r: any) => r.id))

        for (const project_id of projectIds) {
            await syncUserDataPaths({
                project_id,
                updatedAfter: delta,
            })
        }
    }

}
