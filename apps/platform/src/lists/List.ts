import Model from '../core/Model'
import { RuleTree } from '../rules/Rule'

export type ListState = 'draft' | 'ready' | 'loading'
type ListType = 'static' | 'dynamic'

export default class List extends Model {
    project_id!: number
    name!: string
    type!: ListType
    state!: ListState
    rule_id?: number
    rule?: RuleTree
    version!: number
    users_count?: number
    tags?: string[]
    is_visible!: boolean
    refreshed_at?: Date | null
    deleted_at?: Date
    progress?: ListProgress
}

export type ListProgress = {
    complete: number
    total: number
}

export type DynamicList = List & { rule_id: number, rule: RuleTree }

export class UserList extends Model {
    user_id!: number
    list_id!: number
    event_id!: number
    version!: number
    deleted_at?: Date

    static tableName = 'user_list'
}

export type ListUpdateParams = Pick<List, 'name' | 'tags'> & { rule?: RuleTree, published?: boolean }
export type ListCreateParams = ListUpdateParams & Pick<List, 'type' | 'is_visible'> & { rule?: RuleTree }
export type ListVersion = Pick<List, 'id' | 'version'>
