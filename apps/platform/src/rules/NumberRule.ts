import { inferClickHouseType } from '../config/clickhouse'
import { Operator } from './Rule'
import { RuleCheck, RuleEvalException } from './RuleEngine'
import { compile, queryPath, queryValue as queryValues, whereQuery, whereQueryNullable } from './RuleHelpers'

export const numComp = (leftValue: number, operator: Operator, rightValue: number) => {
    switch (operator) {
    case '=':
        return leftValue === rightValue
    case '!=':
        return leftValue !== rightValue
    case '<':
        return leftValue < rightValue
    case '>':
        return leftValue > rightValue
    case '<=':
        return leftValue <= rightValue
    case '>=':
        return leftValue >= rightValue
    default:
        throw new Error('Unknown operator: ' + operator)
    }
}

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
            try {
                return numComp(v, rule.operator, ruleValue)
            } catch (e) {
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

        const ruleValue = compile(rule, item => Number(item))
        const type = inferClickHouseType(ruleValue)

        if (['=', '!=', '<', '<=', '>', '>=', 'any', 'none'].includes(rule.operator)) {
            return whereQuery(path, rule.operator, ruleValue, type)
        }

        throw new RuleEvalException(rule, 'unknown operator: ' + rule.operator)
    },
} satisfies RuleCheck
