import { TemplateEvent } from '../users/UserEvent'
import { TemplateUser, User } from '../users/User'
import Rule, { AnyJson, Operator, RuleGroup, RuleType } from './Rule'
import { Database } from '../config/database'
import NumberRule from './NumberRule'
import StringRule from './StringRule'
import BooleanRule from './BooleanRule'
import DateRule from './DateRule'
import ArrayRule from './ArrayRule'
import WrapperRule from './WrapperRule'

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
    event?: TemplateEvent
}

export interface RuleCheck {
    check(value: RuleCheckInput, rule: Rule, registry: Registry<RuleCheck>): boolean
    query(
        builder: Database.QueryBuilder<any>,
        rule: Rule,
        wrapper: 'and' | 'or',
        registry: Registry<RuleCheck>,
    ): Database.QueryBuilder<any>
}

const ruleRegistry = new Registry<RuleCheck>()

export class RuleEvalException extends Error {
    constructor(rule: Rule, message: string) {
        super(message)
    }
}

ruleRegistry.register('number', NumberRule)
ruleRegistry.register('string', StringRule)
ruleRegistry.register('boolean', BooleanRule)
ruleRegistry.register('date', DateRule)
ruleRegistry.register('array', ArrayRule)
ruleRegistry.register('wrapper', WrapperRule)

export const check = (value: RuleCheckInput, rule: Rule | Rule[]) => {
    if (Array.isArray(rule)) {
        return ruleRegistry.get('wrapper').check(value, rule, ruleRegistry)
    }
    return ruleRegistry.get(rule.type).check(value, rule, ruleRegistry)
}

export const query = (rule: Rule) => {
    const builder = User.query()
        .select('users.id')
        .leftJoin('user_events', 'user_events.user_id', 'users.id')
        .groupBy('users.id')
    return ruleRegistry.get('wrapper')
        .query(builder, rule, 'and', ruleRegistry)
}

interface RuleMake {
    type: RuleType
    group?: RuleGroup
    path?: string
    operator?: Operator
    value?: AnyJson
    children?: Rule[]
}

export const make = ({ type, group = 'user', path = '$', operator = '=', value, children }: RuleMake): Rule => {
    return {
        type, group, path, operator, value, children,
    }
}
