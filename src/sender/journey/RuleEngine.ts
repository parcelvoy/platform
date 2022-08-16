import jsonpath from 'jsonpath'

export type Operator = '=' | '!=' | '<' |'<=' | '>' | '>=' | '=' | 'is set' | 'is not set' | 'or' | 'and' | 'xor'
export type RuleType = 'wrapper' | 'string' | 'number' | 'boolean' | 'date' | 'array'

export interface Rule {
    type: RuleType
    path: string
    operator: Operator
    value?: unknown
    children?: Rule[]
}

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

interface RuleCheck {
    check(value: Record<string, unknown>, rule: Rule): boolean
}

const ruleRegistry = new Registry<RuleCheck>()

class RuleEvalException extends Error {
    constructor(rule: Rule, message: string) {
        super(message)
    }
}

const WrapperRule: RuleCheck = {
    check(input: Record<string, unknown>, rule: Rule) {
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
    check(input: Record<string, unknown>, rule: Rule) {
        const value = String(jsonpath.query(input, rule.path))
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
    check(input: Record<string, unknown>, rule: Rule) {
        const value = Number(jsonpath.query(input, rule.path))

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
    check(input: Record<string, unknown>, rule: Rule) {
        const value = Boolean(jsonpath.query(input, rule.path))
        return value === rule.value
    },
}

ruleRegistry.register('number', NumberRule)
ruleRegistry.register('string', StringRule)
ruleRegistry.register('boolean', BooleanRule)
// TODO: Add dates ruleset
ruleRegistry.register('wrapper', WrapperRule)

export const check = (value: Record<string, unknown>, rules: Rule[]) => {
    const baseRule = make('wrapper', '$', 'and', undefined, rules)
    return ruleRegistry.get('wrapper').check(value, baseRule)
}

export const make = (type: RuleType, path = '$', operator: Operator = '=', value?: unknown, children?: Rule[]): Rule => {
    return {
        type, path, operator, value, children,
    }
}
