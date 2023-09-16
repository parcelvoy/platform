import Model from '../core/Model'
import Rule from '../rules/Rule'

type ListState = 'ready' | 'loading'
type ListType = 'static' | 'dynamic'

export default class List extends Model {
    project_id!: number
    name!: string
    type!: ListType
    state!: ListState
    rule?: Rule
    version!: number
    users_count?: number
    tags?: string[]
    is_visible!: boolean
    deleted_at?: Date

    static jsonAttributes = ['rule']
}

export type DynamicList = List & { rule: Rule }

export class UserList extends Model {
    user_id!: number
    list_id!: number
    event_id!: number
    version!: number
    deleted_at?: Date

    static tableName = 'user_list'
}

export type ListUpdateParams = Pick<List, 'name' | 'rule' | 'tags'> & { syncJourneys?: boolean }
export type ListCreateParams = ListUpdateParams & Pick<List, 'type' | 'is_visible'>
