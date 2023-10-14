import Model, { ModelParams } from '../core/Model'

export type Operator = '=' | '!=' | '<' |'<=' | '>' | '>=' | '=' | 'is set' | 'is not set' | 'or' | 'and' | 'xor' | 'empty' | 'contains' | 'starts with' | 'ends with' | 'any' | 'none'
export type RuleType = 'wrapper' | 'string' | 'number' | 'boolean' | 'date' | 'array'
export type RuleGroup = 'user' | 'event' | 'parent'

export type AnyJson = boolean | number | string | null | JsonArray | JsonMap
export interface JsonMap { [key: string]: AnyJson }
export type JsonArray = Array<AnyJson>

export default class Rule extends Model {
    uuid!: string
    root_uuid?: string
    parent_uuid?: string
    type!: RuleType
    group!: RuleGroup
    path!: string
    operator!: Operator
    value?: AnyJson
}

export type RuleTree = Omit<Rule, ModelParams> & { children?: RuleTree[], id?: number }

export class RuleEvaluation extends Model {
    rule_id!: number
    user_id!: number
    result!: boolean
}
