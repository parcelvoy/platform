import Model from '../core/Model'

export type RulePathDataType = 'string' | 'number' | 'boolean' | 'date' | 'array'
export type RulePathEventName = string
export class ProjectRulePath extends Model {

    project_id!: number
    path!: string
    type!: 'user' | 'event'
    name?: RulePathEventName // event name
    data_type?: RulePathDataType
}

export type GetProjectRulePath = Pick<ProjectRulePath, 'path' | 'type' | 'name' | 'data_type'>
