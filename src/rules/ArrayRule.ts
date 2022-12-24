import { Database } from '../config/database'
import Rule, { JsonArray } from './Rule'
import { RuleCheck, RuleCheckInput, RuleEvalException } from './RuleEngine'
import { queryRuleParams, queryValue, whereQuery, whereQueryNullable } from './RuleHelpers'

export default {
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

        throw new RuleEvalException(rule, 'unknown operator: ' + rule.operator)
    },

    query(builder: Database.QueryBuilder<any>, rule: Rule, wrapper) {
        const queryParams = queryRuleParams(builder, rule, wrapper)

        // Only JSON columns will ever contain arrays
        if (!queryParams.isJson) return builder

        if (rule.operator === 'is set') {
            return whereQueryNullable(queryParams, false)
        }

        if (rule.operator === 'is not set') {
            return whereQueryNullable(queryParams, true)
        }

        if (rule.operator === 'empty') {
            return whereQuery(queryParams, '=', [])
        }

        throw new RuleEvalException(rule, 'unknown operator: ' + rule.operator)
    },
} satisfies RuleCheck
