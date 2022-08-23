import Model from '../models/Model'
import Rule from '../rules/Rule'

export default class List extends Model {
    project_id!: number
    name!: string
    rules!: Rule[]
}

export class UserList extends Model {
    user_id!: number
    list_id!: number
    event_id!: number

    static tableName = 'user_list'
}
