import jsonpath from 'jsonpath'
import { TemplateEvent } from '../users/UserEvent'
import { TemplateUser } from '../users/User'
import Rule, { AnyJson, JsonArray, Operator, RuleGroup, RuleType } from './Rule'
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
    const pathValue = jsonpath.query(input[rule.group], rule.path)?.[0]
    if (!pathValue) return undefined
    return cast(pathValue)
}

const checkArrayOperators = <T>(input: T, operator: Operator, value: T[]): boolean => {
    if (operator === 'any') {
        return value.includes(input)
    }
    if (operator === 'none') {
        return !value.includes(input)
    }
    return false
}

const compile = <Y>(rule: Rule, cast: (item: AnyJson) => Y): Y => {
    const value = rule.value
    if (!value) {
        throw new RuleEvalException(rule, 'value required for operator')
    }
    const compiledValue = typeof value === 'string' && value.includes('{')
        ? Compile(value)
        : value
    return cast(compiledValue)
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

        if (rule.operator === 'is set') {
            return value != null && value !== ''
        }

        if (rule.operator === 'is not set') {
            return value == null
        }

        if (rule.operator === 'empty') {
            return value.length <= 0
        }

        const ruleValue = compile(rule, item => String(item))

        if (rule.operator === '=') {
            return value === ruleValue
        }

        if (rule.operator === '!=') {
            return value !== ruleValue
        }

        if (rule.operator === 'contains') {
            return value.includes(ruleValue)
        }

        if (Array.isArray(rule.value)) {
            return checkArrayOperators(value, rule.operator, rule.value)
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

        const ruleValue = compile(rule, item => Number(item))

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

        if (Array.isArray(rule.value)) {
            return checkArrayOperators(value, rule.operator, rule.value)
        }

        throw new RuleEvalException(rule, 'unknown operator: ' + rule.operator)
    },
}

const BooleanRule: RuleCheck = {
    check(input: RuleCheckInput, rule: Rule) {
        const value = queryValue(input, rule, item => {
            if (typeof item === 'boolean') return item
            if (typeof item === 'string') return item === 'true'
            if (typeof item === 'number') return item === 1
            return false
        })
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

        const ruleValue = compile(rule, item => {
            if (typeof item === 'string' || typeof item === 'number') {
                return new Date(item)
            }
            throw new RuleEvalException(rule, 'invalid value for date comparison')
        })

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

const ArrayRule: RuleCheck = {
    check(input: RuleCheckInput, rule: Rule) {
        const value = queryValue(input, rule, item => {
            return Array.isArray(item) ? item : [item]
        }) as JsonArray
        if (!value) return false

        if (rule.operator === 'is set') {
            return value != null
        }

        if (rule.operator === 'is not set') {
            return value == null
        }

        if (rule.operator === 'empty') {
            return value.length <= 0
        }

        if (!rule.value) {
            throw new RuleEvalException(rule, 'value required for operator')
        }

        if (rule.operator === '=') {
            return value === rule.value
        }

        if (rule.operator === '!=') {
            return value !== rule.value
        }

        if (Array.isArray(rule.value)) {
            return checkArrayOperators(value, rule.operator, rule.value)
        }

        if (rule.operator === 'contains') {
            return value.includes(rule.value)
        }

        throw new RuleEvalException(rule, 'unknown operator: ' + rule.operator)
    },
}

ruleRegistry.register('number', NumberRule)
ruleRegistry.register('string', StringRule)
ruleRegistry.register('boolean', BooleanRule)
ruleRegistry.register('date', DateRule)
ruleRegistry.register('array', ArrayRule)
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
    value?: AnyJson
    children?: Rule[]
}

export const make = ({ type, group = 'user', path = '$', operator = '=', value, children }: RuleMake): Rule => {
    return {
        type, group, path, operator, value, children,
    }
}
