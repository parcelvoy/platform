import Model from '../core/Model'
import { ProjectRole } from './Project'

export class ProjectApiKey extends Model {
    project_id!: number
    value!: string
    name!: string
    scope!: 'public' | 'secret'
    role!: ProjectRole
    description?: string
    deleted_at?: Date
}

export type ProjectApiKeyParams = Pick<ProjectApiKey, 'scope' | 'name' | 'description' | 'role'>
