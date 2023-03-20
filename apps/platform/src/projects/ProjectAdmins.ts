import Model from '../core/Model'
import { ProjectRole } from './Project'

export class ProjectAdmin extends Model {
    project_id!: number
    admin_id?: number
    role!: ProjectRole
    deleted_at?: Date
}

export type ProjectAdminParams = Pick<ProjectAdmin, 'role'>
