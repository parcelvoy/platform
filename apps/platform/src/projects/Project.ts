import Model, { ModelParams } from '../core/Model'

export default class Project extends Model {

    name!: string
    description?: string
    deleted_at?: Date
    locale?: string
    timezone?: string
}

export type ProjectParams = Omit<Project, ModelParams | 'deleted_at'>
