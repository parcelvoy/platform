import Model from '../core/Model'

export default class Project extends Model {

    public name!: string
    public description?: string
    public deleted_at?: Date
}

export type ProjectParams = Omit<Project, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'parseJson'>

export class ProjectApiKey extends Model {

    project_id!: number
    value!: string
    name!: string
    description?: string
    deleted_at?: Date
}
