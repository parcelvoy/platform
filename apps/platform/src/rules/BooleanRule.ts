import { RuleCheck } from './RuleEngine'
import { queryValue } from './RuleHelpers'

export default {
    check({ rule, value }) {
        const values = queryValue(value, rule, item => {
            if (typeof item === 'boolean') return item
            if (typeof item === 'string') return item === 'true'
            if (typeof item === 'number') return item === 1
            return false
        })
        const match = values.some(Boolean)
        return rule.operator === '!=' ? !match : match
    },
} satisfies RuleCheck
