import Model, { ModelParams } from '../core/Model'
import Rule from '../rules/Rule'

type ListState = 'ready' | 'loading'
type ListType = 'static' | 'dynamic'

export default class List extends Model {
    project_id!: number
    name!: string
    type!: ListType
    state!: ListState
    rule!: Rule
    users_count?: number

    static jsonAttributes = ['rule']
}

export class UserList extends Model {
    user_id!: number
    list_id!: number
    event_id!: number
    deleted_at?: Date

    static tableName = 'user_list'
}

export type ListParams = Omit<List, ModelParams | 'users_count'>
