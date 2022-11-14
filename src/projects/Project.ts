import Model, { ModelParams } from '../core/Model'

export default class Project extends Model {

    public name!: string
    public description?: string
    public deleted_at?: Date
}

export type ProjectParams = Omit<Project, ModelParams | 'deleted_at'>
