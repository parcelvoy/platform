import { Database } from '../config/database'
import Rule from './Rule'
import { make, RuleCheck, RuleCheckInput, RuleEvalException } from './RuleEngine'
import { isEventWrapper } from './RuleHelpers'

export default {
    check(input: RuleCheckInput, rule: Rule, registry) {
        const predicate = (child: Rule) => registry.get(child.type)?.check(input, child, registry)

        // If wrapper is for events, evaluate event name alongside conditions
        if (isEventWrapper(rule)) {
            const nameRule = make({ type: 'string', path: '$.name', value: rule.value })
            if (!registry.get('string').check(input, nameRule, registry)) return false
        }

        if (!rule.children) return true

        if (rule.operator === 'or') {
            return rule.children.some(predicate)
        }

        if (rule.operator === 'and') {
            return rule.children.every(predicate)
        }

        throw new RuleEvalException(rule, 'unknown operator: ' + rule.operator)
    },

    query(builder: Database.QueryBuilder<any>, rule: Rule, wrapper, registry) {
        const children = rule.children
        if (!children) return builder

        const operator = rule.operator
        if (operator === 'and' || operator === 'or') {
            return builder.where(qb => {
                if (isEventWrapper(rule)) {
                    qb.where('user_events.name', rule.value)
                }
                for (const child of children) {
                    registry.get(child.type)?.query(qb, child, operator, registry)
                }
            })
        }

        throw new RuleEvalException(rule, 'unknown operator: ' + rule.operator)
    },
} satisfies RuleCheck
