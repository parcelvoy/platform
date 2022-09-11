import Model, { ModelParams } from '../core/Model'
import Rule from '../rules/Rule'

export default class List extends Model {
    project_id!: number
    name!: string
    rules!: Rule[]

    static jsonAttributes = ['rules']
}

export class UserList extends Model {
    user_id!: number
    list_id!: number
    event_id!: number
    deleted_at?: Date

    static tableName = 'user_list'
}

export type ListParams = Omit<List, ModelParams>
