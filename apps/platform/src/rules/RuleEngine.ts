import { TemplateEvent } from '../users/UserEvent'
import { TemplateUser } from '../users/User'
import Rule, { AnyJson, RuleTree, Operator, RuleGroup, RuleType } from './Rule'
import NumberRule from './NumberRule'
import StringRule from './StringRule'
import BooleanRule from './BooleanRule'
import DateRule from './DateRule'
import ArrayRule from './ArrayRule'
import WrapperRule from './WrapperRule'
import { uuid } from '../utilities'

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

export interface RuleCheckParams {
    registry: typeof ruleRegistry
    input: RuleCheckInput // all contextual input data
    rule: RuleTree // current rule to use
    value: Record<string, unknown> // current value to evaluate against
}

export interface RuleCheck {
    check(params: RuleCheckParams): boolean
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
            type: 'wrapper',
            operator: 'and',
            children: rule,
        })
    }
    return ruleRegistry.get(rule.type).check({ registry: ruleRegistry, input, rule, value: input.user })
}

interface RuleMake {
    type: RuleType
    group?: RuleGroup
    path?: string
    operator?: Operator
    value?: AnyJson
    children?: RuleTree[]
}

export const make = ({ type, group = 'user', path = '$', operator = '=', value, children }: RuleMake): RuleTree => {
    return {
        uuid: uuid(),
        type,
        group,
        path,
        operator,
        value,
        children,
    }
}
