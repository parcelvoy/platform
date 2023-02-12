import Model from '../core/Model'

export class ProjectApiKey extends Model {
    project_id!: number
    value!: string
    name!: string
    scope!: 'public' | 'secret'
    description?: string
    deleted_at?: Date
}

export type ProjectApiKeyParams = Pick<ProjectApiKey, 'scope' | 'name' | 'description'>
