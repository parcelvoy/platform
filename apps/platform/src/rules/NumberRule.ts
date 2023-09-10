import { RuleCheck, RuleEvalException } from './RuleEngine'
import { compile, queryValue as queryValues } from './RuleHelpers'

export default {
    check({ rule, value }) {
        const values = queryValues(value, rule, item => Number(item))

        if (rule.operator === 'is set') {
            return values.length > 0
        }

        if (rule.operator === 'is not set') {
            return values.length === 0
        }

        const ruleValue = compile(rule, item => Number(item))

        return values.some(v => {
            switch (rule.operator) {
            case '=':
                return v === ruleValue
            case '!=':
                return v !== ruleValue
            case '<':
                return v < ruleValue
            case '>':
                return v > ruleValue
            case '<=':
                return v <= ruleValue
            case '>=':
                return v >= ruleValue
            default:
                throw new RuleEvalException(rule, 'unknown operator: ' + rule.operator)
            }
        })
    },
} satisfies RuleCheck
