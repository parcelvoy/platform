import { TemplateEvent } from '../users/UserEvent'
import { TemplateUser, User } from '../users/User'
import { Rule, AnyJson, RuleTree, Operator, RuleGroup, RuleType, EventRuleFrequency, EventRuleTree } from './Rule'
import NumberRule from './NumberRule'
import StringRule from './StringRule'
import BooleanRule from './BooleanRule'
import DateRule from './DateRule'
import ArrayRule from './ArrayRule'
import WrapperRule from './WrapperRule'
import { uuid } from '../utilities'
import App from '../app'

class Registry<T> {
    #registered: { [key: string]: T } = {}

    public register(key: string, obj: T) {
        this.#registered[key] = obj
        return this
    }

    public get(key: string) {
        return this.#registered[key]
    }
}

export interface RuleCheckInput {
    user: TemplateUser
    events: TemplateEvent[] // all of this user's events
}

export interface RuleBaseParams {
    registry: typeof ruleRegistry
    rule: RuleTree // current rule to use
}

export interface RuleQueryParams extends RuleBaseParams {
    projectId: number
}

export interface RuleCheckParams extends RuleBaseParams {
    input: RuleCheckInput // all contextual input data
    value: Record<string, unknown> // current value to evaluate against
}

export interface RuleCheck {
    check(params: RuleCheckParams): boolean
    query(params: RuleQueryParams): string
}

const ruleRegistry = new Registry<RuleCheck>()

export class RuleEvalException extends Error {
    constructor(rule: Rule | RuleTree, message: string) {
        super(message)
    }
}

ruleRegistry.register('number', NumberRule)
ruleRegistry.register('string', StringRule)
ruleRegistry.register('boolean', BooleanRule)
ruleRegistry.register('date', DateRule)
ruleRegistry.register('array', ArrayRule)
ruleRegistry.register('wrapper', WrapperRule)

export const check = (input: RuleCheckInput, rule: RuleTree | RuleTree[]) => {
    if (Array.isArray(rule)) {
        rule = make({
            group: 'parent',
            type: 'wrapper',
            operator: 'and',
            children: rule,
        })
    }
    return ruleRegistry.get(rule.type).check({ registry: ruleRegistry, input, rule, value: input.user })
}

export const checkQuery = async (user: User, rule: RuleTree | RuleTree[]) => {
    const subquery = getRuleQuery(user.project_id, rule)
    const query = `select exists(${subquery}) as check`
    const result = await App.main.clickhouse.query({
        query,
        format: 'JSONEachRow',
    })
    const data = await result.json() as { check: boolean }[]
    return data[0].check
}

export const getRuleQuery = (projectId: number, rule: RuleTree | RuleTree[]) => {
    if (Array.isArray(rule)) {
        rule = make({
            type: 'wrapper',
            operator: 'and',
            children: rule,
        })
    }
    return ruleRegistry.get(rule.type).query({ projectId, registry: ruleRegistry, rule })
}

interface RuleMake {
    type: RuleType
    group?: RuleGroup
    path?: string
    operator?: Operator
    value?: AnyJson
    children?: RuleTree[]
    frequency?: EventRuleFrequency
}

export const make = ({
    type,
    group = 'user',
    path = '$',
    operator = '=',
    value,
    children,
    frequency,
}: RuleMake): RuleTree | EventRuleTree => {
    const rule = {
        uuid: uuid(),
        type,
        group,
        path,
        operator,
        value,
        children,
        frequency,
    }

    children?.forEach(child => {
        child.parent_uuid = rule.uuid
    })

    return rule
}
