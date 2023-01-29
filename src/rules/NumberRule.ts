import Rule from './Rule'
import { Database } from '../config/database'
import { RuleCheck, RuleCheckInput, RuleEvalException } from './RuleEngine'
import { checkArrayOperators, compile, queryRuleParams, queryValue, whereQuery, whereQueryNullable } from './RuleHelpers'

export default {
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

    query(builder: Database.QueryBuilder<any>, rule: Rule, wrapper) {
        const queryParams = queryRuleParams(builder, rule, wrapper)

        if (rule.operator === 'is set') {
            return whereQueryNullable(queryParams, false)
        }

        if (rule.operator === 'is not set') {
            return whereQueryNullable(queryParams, true)
        }

        const ruleValue = compile(rule, item => Number(item))

        if (['=', '!=', '<', '<=', '>', '>='].includes(rule.operator)) {
            return whereQuery(queryParams, rule.operator, ruleValue)
        }

        if (Array.isArray(rule.value)) {
            if (rule.operator === 'any') {
                return whereQuery(queryParams, 'in', rule.value)
            }
            if (rule.operator === 'none') {
                return whereQuery(queryParams, 'not in', rule.value)
            }
        }

        throw new RuleEvalException(rule, 'unknown operator: ' + rule.operator)
    },
} satisfies RuleCheck
