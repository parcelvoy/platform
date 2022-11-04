import jsonpath from 'jsonpath'
import { TemplateEvent } from '../users/UserEvent'
import { TemplateUser } from '../users/User'
import Rule, { Operator, RuleGroup, RuleType } from './Rule'
import { isAfter, isBefore, isEqual } from 'date-fns'
import { Compile } from '../render'

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

interface RuleCheckInput {
    user: TemplateUser
    event?: TemplateEvent
}

interface RuleCheck {
    check(value: RuleCheckInput, rule: Rule): boolean
}

const ruleRegistry = new Registry<RuleCheck>()

class RuleEvalException extends Error {
    constructor(rule: Rule, message: string) {
        super(message)
    }
}

const queryValue = <T>(input: RuleCheckInput, rule: Rule, cast: (item: any) => T): T | undefined => {
    const inputValue = input[rule.group]
    if (!inputValue) return undefined
    const pathValue = jsonpath.query(input[rule.group], rule.path)
    if (!pathValue) return undefined
    return cast(pathValue)
}

const WrapperRule: RuleCheck = {
    check(input: RuleCheckInput, rule: Rule) {
        const predicate = (child: Rule) => ruleRegistry.get(child.type)?.check(input, child)
        if (!rule.children) return true

        if (rule.operator === 'or') {
            return rule.children.some(predicate)
        }

        if (rule.operator === 'xor') {
            return rule.children?.filter(predicate).length === 1
        }

        if (rule.operator === 'and') {
            return rule.children.every(predicate)
        }

        throw new RuleEvalException(rule, 'unknown operator: ' + rule.operator)
    },
}

const StringRule: RuleCheck = {
    check(input: RuleCheckInput, rule: Rule) {
        const value = queryValue(input, rule, item => String(item))
        if (!value) return false

        if (rule.operator === '=') {
            return value === rule.value
        }

        if (rule.operator === '!=') {
            return value !== rule.value
        }

        if (rule.operator === 'is set') {
            return value != null && value !== ''
        }

        throw new RuleEvalException(rule, 'unknown operator: ' + rule.operator)
    },
}

const NumberRule: RuleCheck = {
    check(input: RuleCheckInput, rule: Rule) {
        const value = queryValue(input, rule, item => Number(item))
        if (!value) return false

        if (rule.operator === 'is set') {
            return value != null
        }

        if (rule.operator === 'is not set') {
            return value == null
        }

        if (!rule.value) {
            throw new RuleEvalException(rule, 'value required for operator')
        }
        const ruleValue = Number(rule.value)

        if (rule.operator === '=') {
            return value === ruleValue
        }

        if (rule.operator === '!=') {
            return value !== ruleValue
        }

        if (rule.operator === '<') {
            return value < ruleValue
        }

        if (rule.operator === '<=') {
            return value <= ruleValue
        }

        if (rule.operator === '>') {
            return value > ruleValue
        }

        if (rule.operator === '>=') {
            return value >= ruleValue
        }

        throw new RuleEvalException(rule, 'unknown operator: ' + rule.operator)
    },
}

const BooleanRule: RuleCheck = {
    check(input: RuleCheckInput, rule: Rule) {
        const value = queryValue(input, rule, item => Boolean(item))
        return value === rule.value
    },
}

const DateRule: RuleCheck = {
    check(input: RuleCheckInput, rule: Rule) {
        const value = queryValue(input, rule, item => new Date(item))
        if (!value) return false

        if (rule.operator === 'is set') {
            return value != null
        }

        if (rule.operator === 'is not set') {
            return value == null
        }

        if (!rule.value) {
            throw new RuleEvalException(rule, 'value required for operator')
        }

        // Use Handlebars to manipulate date before interpreting
        const compiledValue = Compile(String(rule.value))
        const ruleValue = new Date(compiledValue)

        if (rule.operator === '=') {
            return isEqual(value, ruleValue)
        }

        if (rule.operator === '!=') {
            return !isEqual(value, ruleValue)
        }

        if (rule.operator === '<') {
            return isBefore(value, ruleValue)
        }

        if (rule.operator === '<=') {
            return isBefore(value, ruleValue) || isEqual(value, ruleValue)
        }

        if (rule.operator === '>') {
            return isAfter(value, ruleValue)
        }

        if (rule.operator === '>=') {
            return isAfter(value, ruleValue) || isEqual(value, ruleValue)
        }

        throw new RuleEvalException(rule, 'unknown operator: ' + rule.operator)
    },
}

ruleRegistry.register('number', NumberRule)
ruleRegistry.register('string', StringRule)
ruleRegistry.register('boolean', BooleanRule)
ruleRegistry.register('date', DateRule)
ruleRegistry.register('wrapper', WrapperRule)

export const check = (value: RuleCheckInput, rules: Rule[]) => {
    const baseRule = make({ type: 'wrapper', operator: 'and', children: rules })
    return ruleRegistry.get('wrapper').check(value, baseRule)
}

interface RuleMake {
    type: RuleType
    group?: RuleGroup
    path?: string
    operator?: Operator
    value?: unknown
    children?: Rule[]
}

export const make = ({ type, group = 'user', path = '$', operator = '=', value, children }: RuleMake): Rule => {
    return {
        type, group, path, operator, value, children,
    }
}
