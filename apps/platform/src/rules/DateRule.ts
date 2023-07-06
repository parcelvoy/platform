import { isAfter, isBefore, isEqual } from 'date-fns'
import { Database } from '../config/database'
import Rule from './Rule'
import { RuleCheck, RuleCheckInput, RuleEvalException } from './RuleEngine'
import { compile, queryRuleParams, queryValue, whereQuery, whereQueryNullable } from './RuleHelpers'

export default {
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

    query(builder: Database.QueryBuilder<any>, rule: Rule, wrapper) {
        const queryParams = queryRuleParams(builder, rule, wrapper)

        if (rule.operator === 'is set') {
            return whereQueryNullable(queryParams, false)
        }

        if (rule.operator === 'is not set') {
            return whereQueryNullable(queryParams, true)
        }

        const ruleValue = compile(rule, item => {
            if (typeof item === 'string' || typeof item === 'number') {
                return new Date(item)
            }
            throw new RuleEvalException(rule, 'invalid value for date comparison')
        })

        if (['=', '!=', '<', '<=', '>', '>='].includes(rule.operator)) {
            return whereQuery(queryParams, rule.operator, ruleValue)
        }

        throw new RuleEvalException(rule, 'unknown operator: ' + rule.operator)
    },
} satisfies RuleCheck
