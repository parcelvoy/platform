import { RuleCheck, RuleEvalException } from './RuleEngine'
import { queryValue } from './RuleHelpers'

export default {
    check({ rule, value }) {
        const values = queryValue(value, rule, item => item)

        if (rule.operator === 'is set') {
            return values.some(x => Array.isArray(x))
        }

        if (rule.operator === 'is not set') {
            return values.every(x => !Array.isArray(x))
        }

        if (rule.operator === 'empty') {
            return values.every(x => !Array.isArray(x) || x.length === 0)
        }

        throw new RuleEvalException(rule, 'unknown operator: ' + rule.operator)
    },
} satisfies RuleCheck
