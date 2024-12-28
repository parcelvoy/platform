import { RuleCheck, RuleEvalException } from './RuleEngine'
import { compile, queryValue } from './RuleHelpers'

export default {
    check({ rule, value }) {
        const values = queryValue(value, rule, item => {
            if (typeof item === 'string') return item
            if (typeof item === 'boolean' || typeof item === 'number') {
                return String(item)
            }
            return null
        })

        if (rule.operator === 'is set') {
            return values.some(v => typeof v === 'string')
        }

        if (rule.operator === 'is not set') {
            return values.every(x => x === null)
        }

        if (rule.operator === 'empty') {
            return values.every(x => !x)
        }

        const ruleValue = compile(rule, item => String(item))

        return values.some(v => {
            switch (rule.operator) {
            case '=':
                return v === ruleValue
            case '!=':
                return v !== ruleValue
            case 'starts with':
                return v?.startsWith(ruleValue)
            case 'not start with':
                return !v?.startsWith(ruleValue)
            case 'ends with':
                return v?.endsWith(ruleValue)
            case 'contains':
                return v?.includes(ruleValue)
            case 'not contain':
                return !v?.includes(ruleValue)
            default:
                throw new RuleEvalException(rule, 'unknown operator: ' + rule.operator)
            }
        })
    },
} satisfies RuleCheck
