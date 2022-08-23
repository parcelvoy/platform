export type Operator = '=' | '!=' | '<' |'<=' | '>' | '>=' | '=' | 'is set' | 'is not set' | 'or' | 'and' | 'xor'
export type RuleType = 'wrapper' | 'string' | 'number' | 'boolean' | 'date' | 'array'
export type RuleGroup = 'user' | 'event'

export default interface Rule {
    type: RuleType
    group: RuleGroup
    path: string
    operator: Operator
    value?: unknown
    children?: Rule[]
}
