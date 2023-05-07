import Model from '../core/Model'

export class ProjectRulePath extends Model {

    project_id!: number
    path!: string
    type!: 'user' | 'event'
    name?: string // event name

}
