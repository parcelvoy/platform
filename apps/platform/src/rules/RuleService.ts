import { ModelParams } from '../core/Model'
import { User } from '../users/User'
import { UserEvent } from '../users/UserEvent'
import { groupBy, uuid } from '../utilities'
import Rule, { RuleEvaluation, RuleTree } from './Rule'
import { check } from './RuleEngine'

export type RuleWithEvaluationResult = Omit<Rule, ModelParams> & { result?: boolean }

type RuleWithEvaluationId = Rule & {
    evaluation_id: number,
    parent_uuid: string,
    root_uuid: string,
}
export type RuleResults = { success: string[], failure: string[] }

export const checkRules = (user: User, rules: Array<RuleWithEvaluationResult>) => {
    return rules.every(rule => {
        return rule.group === 'user'
            ? check({ user: user.flatten(), events: [] }, rule as Rule)
            : rule.result ?? false
    })
}

export const checkParentRule = async (uuid: string, user: User) => {
    const rules = await Rule.all(qb =>
        qb.leftJoin('rule_evaluations', 'rule_evaluations.rule_id', 'rules.id')
            .where('parent_uuid', uuid)
            .where('user_id', user.id)
            .where('result', false)
            .select('rules.*', 'result'),
    ) as Array<Rule & { result?: boolean }>
    return checkRules(user, rules)
}

// Event Logic:
// - Look for all rules that are event and the name matches
// - If there are any with a falsy evaluation, evaluate the current event against the logic
// - If evaluates to false, break
// - If it matches
//     - Update rule evaluation to true
//     - Fetch everything with the same parent ID and check if all are true, if so, join user to the list

export const matchingRulesForEvent = async (user: User, event: UserEvent): Promise<RuleResults> => {

    // Get all rules where the event name matches and the evaluation is false
    const children = await Rule.all(qb =>
        qb.leftJoin('rules as p', 'p.uuid', 'rules.parent_uuid')
            .leftJoin('rule_evaluations', 'rule_evaluations.rule_id', 'p.id')
            .where('p.value', event.name)
            .where('p.group', 'event')
            .where('p.type', 'wrapper')
            .where('user_id', user.id)
            .where('result', false)
            .select('rules.*', 'rule_evaluations.id as evaluation_id'),
    ) as Array<RuleWithEvaluationId>

    // Group children together to form event wrapper rules
    const groups = groupBy(children, child => child.parent_uuid)

    // Iterate through all rules to see if any are true and need to be updated
    const success: string[] = []
    const failure: string[] = []
    for (const [parentUuid, group] of groups) {
        const result = await checkEventRule(parentUuid, group, user, event)
        result
            ? success.push(group[0].root_uuid)
            : failure.push(group[0].root_uuid)
    }
    return { success, failure }
}

export const matchingRulesForUser = async (user: User): Promise<RuleResults> => {
    const rules = await Rule.all(qb =>
        qb.where('rules.group', 'parent')
            .where('rules.type', 'wrapper')
            .where('user_id', user.id)
            .select('rules.*', 'rule_evaluations.id as evaluation_id'),
    ) as Array<RuleWithEvaluationId>

    const success = []
    const failure = []
    for (const rule of rules) {
        const result = await checkParentRule(rule.uuid, user)
        result
            ? success.push(rule.uuid)
            : failure.push(rule.uuid)
    }
    return { success, failure }
}

const checkEventRule = async (
    parentUuid: string,
    rules: RuleWithEvaluationId[],
    user: User,
    event: UserEvent,
): Promise<boolean> => {
    const evaluationId = rules[0].evaluation_id
    const result = check({
        user: user.flatten(),
        events: [event.flatten()],
    }, {
        uuid: uuid(),
        path: '$.name',
        type: 'wrapper',
        group: 'event',
        value: event.name,
        children: rules,
        operator: 'and',
    })

    // If event is true, update the evaluation and recheck parent rule
    if (result) {
        await RuleEvaluation.update(qb => qb.where('id', evaluationId), { result: true })
        return await checkParentRule(parentUuid, user)
    }
    return false
}

export const mergeInsertRules = async (newRule: RuleTree) => {
    const [wrapper, ...rules] = decompileRule(newRule)
    const previousRules = await Rule.all(qb => qb.where('root_uuid', wrapper.uuid))

    const newItems = []
    const removedItems: number[] = []
    for (const item of rules) {
        const previous = previousRules.find(r => r.uuid === item.uuid)
        if (previous) {
            removedItems.push(previous.id)
        }
        newItems.push(item)
    }

    for (const item of previousRules) {
        const previous = rules.find(r => r.uuid === item.uuid)
        if (!previous) {
            removedItems.push(item.id)
        }
    }

    await Rule.delete(qb => qb.whereIn('id', removedItems))
    await Rule.insert(newItems)

    return newItems
}

export const compileRule = async (rootId: number): Promise<RuleTree | undefined> => {
    const rules = await Rule.all(qb =>
        qb.where('root_id', rootId)
            .orWhere('id', rootId),
    )
    const node = rules.find(rule => rule.id === rootId) as RuleTree
    if (!node) return undefined

    const build = (node: RuleTree): RuleTree => {
        const children = rules.filter(rule => rule.parent_uuid === node.uuid)
        node.children = children
        for (const child of children) {
            build(child)
        }
        return node
    }

    return build(node)
}

export const decompileRule = (rule: RuleTree): Partial<Rule>[] => {
    const rules = [rule]
    const build = (rule: RuleTree) => {
        if (rule.children) {
            for (const child of rule.children) {
                rules.push(child)
                build(child)
            }
        }
    }
    build(rule)
    return rules
}
