import Rule from './Rule'
import { Database } from '../config/database'
import { RuleCheck, RuleCheckInput } from './RuleEngine'
import { queryRuleParams, queryValue, whereQuery } from './RuleHelpers'

export default {
    check(input: RuleCheckInput, rule: Rule) {
        const value = queryValue(input, rule, item => {
            if (typeof item === 'boolean') return item
            if (typeof item === 'string') return item === 'true'
            if (typeof item === 'number') return item === 1
            return false
        })
        return value === rule.value
    },

    query(builder: Database.QueryBuilder<any>, rule: Rule, wrapper) {
        const queryParams = queryRuleParams(builder, rule, wrapper)
        const value = rule.value ?? true
        return whereQuery(queryParams, '=', value)
    },
} satisfies RuleCheck
