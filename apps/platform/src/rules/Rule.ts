export type Operator = '=' | '!=' | '<' |'<=' | '>' | '>=' | '=' | 'is set' | 'is not set' | 'or' | 'and' | 'empty' | 'contains' | 'not contain' | 'starts with' | 'not start with' | 'ends with' | 'any' | 'none'
export type RuleType = 'wrapper' | 'string' | 'number' | 'boolean' | 'date' | 'array'
export type RuleGroup = 'user' | 'event' | 'parent'

export type AnyJson = boolean | number | string | null | JsonArray | JsonMap
export interface JsonMap { [key: string]: AnyJson }
export type JsonArray = Array<AnyJson>

export type Rule = {
    uuid: string
    root_uuid?: string
    parent_uuid?: string
    type: RuleType
    group: RuleGroup
    path: string
    operator: Operator
    value?: AnyJson
}

export type EventRulePeriod = {
    type: 'rolling'
    unit: 'hour' | 'minute' | 'day' | 'week' | 'month' | 'year'
    value: number
} | {
    type: 'fixed'
    start_date: string
    end_date?: string
}

export type EventRuleFrequency = {
    period: EventRulePeriod
    operator: '=' | '<' | '<=' | '>' | '>='
    count: number
}

export type EventRule = {
    type: 'wrapper'
    group: 'event'
    frequency?: EventRuleFrequency
} & Rule

export type RuleTree = Rule & { children?: RuleTree[], id?: number }
export type EventRuleTree = EventRule & { children?: EventRuleTree[] }
