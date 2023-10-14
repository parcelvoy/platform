import { ModelParams } from '../core/Model'
import { User } from '../users/User'
import { UserEvent } from '../users/UserEvent'
import { groupBy, uuid } from '../utilities'
import Rule, { RuleEvaluation, RuleTree } from './Rule'
import { check } from './RuleEngine'

export type RuleWithEvaluationResult = Omit<Rule, ModelParams | 'equals'> & { result?: boolean }

type RuleWithEvaluationId = Rule & {
    evaluation_id: number,
    parent_id: number,
    parent_uuid: string,
    root_uuid: string,
}
export type RuleResults = { success: string[], failure: string[] }

/**
 * For a given user and set of rules joined with evaluation results,
 * check if all rules are true.
 *
 * This is the fastest option available for checking a rule set since it
 * uses cached values.
 */
export const checkRules = (user: User, rules: Array<RuleWithEvaluationResult>) => {
    return rules.every(rule => {
        return rule.group === 'user'
            ? check({ user: user.flatten(), events: [] }, rule as Rule)
            : rule.result ?? false
    })
}

/**
 * For a provided root rule UUID of a set, fetch the associated rules
 * and check if the entire rule set is true.
 *
 * This uses cached result values for evaluations.
 */
export const checkRootRule = async (uuid: string, user: User) => {
    const rules = await Rule.all(qb =>
        qb.leftJoin('rule_evaluations', 'rule_evaluations.rule_id', 'rules.id')
            .where('parent_uuid', uuid)
            .where('user_id', user.id)
            .select('rules.*', 'result'),
    ) as Array<Rule & { result?: boolean }>
    return checkRules(user, rules)
}

/**
 * Find all of the rules that are associated to the provided event along
 * with if that event moves a rule set from false to true or vice versa.
 *
 * Uses the provided event to calculate a new evaluation result (cache)
 * for each rule.
 */
export const matchingRulesForEvent = async (user: User, event: UserEvent): Promise<RuleResults> => {

    // Get all rules where the event name matches and the evaluation is false
    const children = await Rule.all(qb =>
        qb.leftJoin('rules as p', 'p.uuid', 'rules.parent_uuid')
            .leftJoin('rule_evaluations', function() {
                this.on('rule_evaluations.rule_id', 'p.id')
                    .andOn('rule_evaluations.user_id', Rule.raw(user.id))
            })
            .where('p.value', event.name)
            .where('p.group', 'event')
            .where('p.type', 'wrapper')
            .select('rules.*', 'rule_evaluations.id as evaluation_id', 'p.id as parent_id'),
    ) as Array<RuleWithEvaluationId>

    // Group children together to form event wrapper rules
    const groups = groupBy(children, child => child.parent_uuid)

    // Iterate through all rules to see if any are true and need to be updated
    const success: string[] = []
    const failure: string[] = []
    for (const [_, group] of groups) {
        const result = await checkEventRule(group[0].root_uuid, group, user, event)
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
            .select('rules.*', 'rule_evaluations.id as evaluation_id', 'p.id as parent_id'),
    ) as Array<RuleWithEvaluationId>

    const success = []
    const failure = []
    for (const rule of rules) {
        const result = await checkRootRule(rule.root_uuid, user)
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
        evaluationId
            ? await RuleEvaluation.update(qb => qb.where('id', evaluationId), { result: true })
            : await RuleEvaluation.insert({
                rule_id: rules[0].parent_id,
                user_id: user.id,
                result: true,
            })
        return await checkRootRule(parentUuid, user)
    }
    return false
}

/**
 * For a given new rule tree intelligently merge with the existing rules
 */
export const mergeInsertRules = async (newRule: RuleTree) => {
    const [wrapper, ...rules] = decompileRule(newRule)
    const previousRules = await Rule.all(qb => qb.where('root_uuid', wrapper.uuid))

    const newItems = []
    const removedItems: number[] = []
    for (const item of rules) {
        const previous = previousRules.find(r => r.uuid === item.uuid)
        if (previous && !previous.equals(item)) {
            removedItems.push(previous.id)
            newItems.push({ ...item, id: undefined })
        }
        if (!previous) newItems.push(item)
    }

    for (const item of previousRules) {
        const previous = rules.find(r => r.uuid === item.uuid)
        if (!previous) {
            removedItems.push(item.id)
        }
    }

    await Rule.delete(qb => qb.whereIn('id', removedItems))
    if (newItems.length) await Rule.insert(newItems)

    return newItems
}

/**
 * For a given root ID value of a rule set, find all children and compile
 * into a nested tree structure.
 */
export const compileRule = async (rootId: number): Promise<RuleTree | undefined> => {
    const wrapper = await Rule.find(rootId)
    if (!wrapper) return undefined

    const rules = await Rule.all(qb => qb.where('root_uuid', wrapper!.uuid))

    const build = ({ uuid, created_at, updated_at, ...rest }: Rule): RuleTree => {
        const children = rules.filter(rule => rule.parent_uuid === uuid)
        return {
            ...rest,
            uuid,
            children: children.map(build),
        }
    }

    return build(wrapper)
}

/**
 * For a given nested rule tree, decompile into a list for insertion into
 * the database.
 */
export const decompileRule = (rule: RuleTree): Rule[] => {
    const rules: Rule[] = []
    const build = ({ children, ...rule }: RuleTree) => {
        rules.push(Rule.fromJson(rule))
        if (children) {
            for (const child of children) {
                build(child)
            }
        }
    }
    build(rule)
    return rules
}
