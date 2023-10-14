import { RuleTree } from './Rule'
import { RuleCheck, RuleCheckParams, RuleEvalException } from './RuleEngine'
import { isEventWrapper } from './RuleHelpers'

const checkWrapper = ({ input, registry, rule, value }: RuleCheckParams) => {

    const predicate = (child: RuleTree) => registry.get(child.type)?.check({ input, registry, rule: child, value })

    if (!rule.children) return true

    if (rule.operator === 'or') {
        return rule.children.some(predicate)
    }

    if (rule.operator === 'and') {
        return rule.children.every(predicate)
    }

    if (rule.operator === 'none') {
        return !rule.children.some(predicate)
    }

    if (rule.operator === 'xor') {
        return rule.children.filter(predicate).length === 1
    }

    throw new RuleEvalException(rule, 'unknown operator: ' + rule.operator)
}

export default {
    check(params) {
        if (isEventWrapper(params.rule)) {
            if (!params.rule.value) return false
            return params.input.events.some(event => {
                if (event.name !== params.rule.value) {
                    return false
                }
                return checkWrapper({ ...params, value: event })
            })
        }
        return checkWrapper(params)
    },
} satisfies RuleCheck
