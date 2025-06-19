import { isAfter, isBefore, isEqual } from 'date-fns'
import { RuleCheck, RuleEvalException } from './RuleEngine'
import { compile, queryPath, queryValue, whereQuery, whereQueryNullable } from './RuleHelpers'
import { Rule, RuleTree } from './Rule'

export const dateCompile = (rule: Rule | RuleTree) => compile(rule, item => {
    if (typeof item === 'string' || typeof item === 'number') {
        return new Date(item)
    }
    throw new RuleEvalException(rule, 'invalid value for date comparison')
})

export default {
    check({ rule, value }) {
        const values = queryValue(value, rule, item => new Date(item))

        if (rule.operator === 'is set') {
            return values.some(d => d)
        }

        if (rule.operator === 'is not set') {
            return !values.some(d => d)
        }

        const ruleValue = dateCompile(rule)

        return values.some(d => {
            switch (rule.operator) {
            case '=':
                return isEqual(d, ruleValue)
            case '!=':
                return !isEqual(d, ruleValue)
            case '<':
                return isBefore(d, ruleValue)
            case '<=':
                return isBefore(d, ruleValue) || isEqual(d, ruleValue)
            case '>':
                return isAfter(d, ruleValue)
            case '>=':
                return isEqual(d, ruleValue) || isAfter(d, ruleValue)
            default:
                throw new RuleEvalException(rule, 'unknown operator: ' + rule.operator)
            }
        })
    },
    query({ rule }) {
        const path = queryPath(rule)

        if (rule.operator === 'is set') {
            return whereQueryNullable(path, false)
        }

        if (rule.operator === 'is not set') {
            return whereQueryNullable(path, true)
        }

        const ruleValue = dateCompile(rule)

        if (['=', '!=', '<', '<=', '>', '>='].includes(rule.operator)) {
            return whereQuery(path, rule.operator, ruleValue.getTime())
        }

        throw new RuleEvalException(rule, 'unknown operator: ' + rule.operator)
    },
} satisfies RuleCheck
