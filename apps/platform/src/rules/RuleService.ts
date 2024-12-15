import App from '../app'
import { cacheDel, cacheGet, cacheSet } from '../config/redis'
import { ModelParams } from '../core/Model'
import Project from '../projects/Project'
import { User } from '../users/User'
import { UserEvent } from '../users/UserEvent'
import { uuid, visit } from '../utilities'
import { dateCompile } from './DateRule'
import Rule, { RuleEvaluation, RuleTree } from './Rule'
import { check } from './RuleEngine'

export type RuleWithEvaluationResult = Omit<Rule, ModelParams | 'equals'> & { result?: boolean }

interface EvaluationId {
    evaluation_id: number
    parent_uuid: string
    root_uuid: string
}

type RuleWithEvaluationId = Rule & EvaluationId
type RuleTreeWithEvaluationId = RuleTree & EvaluationId
export type RuleResults = { success: string[], failure: string[] }

const CacheKeys = {
    ruleTree: (rootId: number) => `rule_tree:${rootId}`,
}

/**
 * For a given user and set of rules joined with evaluation results,
 * check if all rules are true.
 *
 * This is the fastest option available for checking a rule set since it
 * uses cached values.
 */
export const checkRules = (user: User, root: Rule | RuleTree, rules: RuleWithEvaluationResult[]) => {
    const predicate = (rule: RuleWithEvaluationResult) => {
        return rule.group === 'user'
            ? check({ user: user.flatten(), events: [] }, rule as Rule)
            : rule.result ?? false
    }
    if (root.operator === 'or') return rules.some(predicate)
    if (root.operator === 'none') return !rules.some(predicate)
    if (root.operator === 'xor') return rules.filter(predicate).length === 1
    return rules.every(predicate)
}

/**
 * For a provided root rule UUID of a set, fetch the associated rules
 * and check if the entire rule set is true.
 *
 * This uses cached result values for evaluations.
 */
export const checkRootRule = async (uuid: string, user: User) => {
    const [root, ...rules] = await Rule.all(qb => qb
        .leftJoin('rule_evaluations', function() {
            this.on('rule_evaluations.rule_id', 'rules.id')
                .andOn('rule_evaluations.user_id', Rule.raw(user.id))
        })
        .where('parent_uuid', uuid)
        .orWhere('uuid', uuid)
        .select('rules.*', 'result'),
    ) as Array<Rule & { result?: boolean }>
    return checkRules(user, root, rules)
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
    const children = await Rule.all(qb => qb
        .leftJoin('rules as p', function() {
            this.on('p.uuid', 'rules.parent_uuid').orOn('p.uuid', 'rules.uuid')
        })
        .leftJoin('rule_evaluations', function() {
            this.on('rule_evaluations.rule_id', 'p.id')
                .andOn('rule_evaluations.user_id', Rule.raw(user.id))
        })
        .where('p.value', event.name)
        .where('p.group', 'event')
        .where('p.type', 'wrapper')
        .where('rules.project_id', user.project_id)
        .select('rules.*', 'rule_evaluations.id as evaluation_id'),
    ) as Array<RuleWithEvaluationId>

    // Build nodes out of results
    const nodes = children
        .filter(child => child.parent_uuid === child.root_uuid)
        .map(child => compileRule(child, children) as RuleTreeWithEvaluationId)

    // Iterate through all rules to see if any are true and need to be updated
    const success: string[] = []
    const failure: string[] = []
    for (const node of nodes) {
        const result = await checkEventRule(node, user, event)
        result
            ? success.push(node.root_uuid!)
            : failure.push(node.root_uuid!)
    }
    return { success, failure }
}

export const matchingRulesForUser = async (user: User): Promise<RuleResults> => {
    const rules = await Rule.all(qb =>
        qb.where('rules.group', 'parent')
            .where('rules.type', 'wrapper')
            .where('project_id', user.project_id),
    )

    const success = []
    const failure = []
    for (const rule of rules) {
        const result = await checkRootRule(rule.uuid, user)
        result
            ? success.push(rule.uuid)
            : failure.push(rule.uuid)
    }
    return { success, failure }
}

const checkEventRule = async (
    node: RuleTreeWithEvaluationId,
    user: User,
    event: UserEvent,
): Promise<boolean> => {
    const evaluationId = node.evaluation_id
    const result = check({
        user: user.flatten(),
        events: [event.flatten()],
    }, node)

    // If event is true, update the evaluation and recheck parent rule
    if (result) {
        evaluationId
            ? await RuleEvaluation.update(
                qb => qb.where('id', evaluationId),
                { result: true },
            )
            : await RuleEvaluation.query()
                .insert({
                    rule_id: node.id,
                    user_id: user.id,
                    result: true,
                })
                .onConflict(['user_id', 'rule_id'])
                .merge(['result'])
        return await checkRootRule(node.root_uuid!, user)
    }
    return false
}

export const splitRuleTree = (rule: RuleTree) => {
    const eventRules: RuleTree[] = []
    const userRules: RuleTree[] = []
    visit(rule, r => r.children, r => {
        if (r.id === rule.id) return
        if (r.type === 'wrapper' && r.group === 'event') {
            eventRules.push(r)
        } else if (r.group === 'user') {
            userRules.push(r)
        }
    })
    return { eventRules, userRules }
}

/**
 * For a given new rule tree intelligently merge with the existing rules
 */
export const mergeInsertRules = async (rules: Rule[]) => {
    const root = rules[0]
    const previousRules = await Rule.all(qb => qb
        .where('root_uuid', root.uuid)
        .orWhere('uuid', root.uuid),
    )

    const newItems = []
    const removedItems: number[] = []
    for (const item of rules) {
        const previous = previousRules.find(r => r.uuid === item.uuid)
        if (previous && !previous.equals(item)) {
            newItems.push({ ...item, id: previous.id })
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
    for (const rule of newItems) {
        rule.id
            ? await Rule.update(qb => qb.where('id', rule.id), rule)
            : await Rule.insert(rule)
    }

    await cacheDel(App.main.redis, CacheKeys.ruleTree(root.id))

    return newItems
}

/**
 * For a given root ID value of a rule set, find all children and compile
 * into a nested tree structure.
 */
export const fetchAndCompileRule = async (rootId: number): Promise<RuleTree | undefined> => {

    const cache = await cacheGet<RuleTree>(App.main.redis, CacheKeys.ruleTree(rootId))
    if (cache) return cache

    const root = await Rule.find(rootId)
    if (!root) return undefined

    const rules = await Rule.all(qb => qb.where('root_uuid', root!.uuid))
    const compiled = compileRule(root, rules)
    await cacheSet(App.main.redis, CacheKeys.ruleTree(rootId), compiled, 3600)
    return compiled
}

export const compileRule = (root: Rule, rules: Rule[]): RuleTree => {
    const build = ({ uuid, project_id, created_at, updated_at, ...rest }: Rule): RuleTree => {
        const children = rules.filter(rule => rule.parent_uuid === uuid)
        return {
            ...rest,
            uuid,
            children: children.map(build),
        }
    }

    return build(root)
}

/**
 * For a given nested rule tree, decompile into a list for insertion into
 * the database.
 */
export const decompileRule = (rule: RuleTree, extras?: any): Rule[] => {
    const rules: Rule[] = []
    const build = ({ children, ...rule }: RuleTree) => {
        rules.push(Rule.fromJson({ ...rule, ...extras }))
        if (children) {
            for (const child of children) {
                build(child)
            }
        }
    }
    build(rule)
    return rules
}

export interface DateRuleTypes {
    dynamic: boolean
    after: boolean
    before: boolean
    value: Date
}

export const getDateRuleType = (rule: Rule): DateRuleTypes | undefined => {
    // If not a date rule, return undefined
    if (rule.type !== 'date') return undefined

    // Calculate the raw value and the compiled value
    const rawValue = JSON.stringify(rule.value ?? '')
    const value = dateCompile(rule)

    // A rule is dynamic if its handlebars and based on a
    // relative date
    const dynamic = rawValue.includes('{{') && rawValue.includes('now')

    // Check operators to determine what direction events should be
    // look for
    const after = ['>=', '>'].includes(rule.operator)
    const before = ['<=', '<', '='].includes(rule.operator)
    return { dynamic, after, before, value }
}

export const getDateRuleTypes = async (rootId: number): Promise<DateRuleTypes | undefined> => {
    const root = await Rule.find(rootId)
    if (!root) return undefined
    const project = await Project.find(root.project_id)
    if (!project) return undefined

    const rules = await Rule.all(
        qb => qb.where('root_uuid', root!.uuid)
            .where('type', 'date'),
    )

    let dynamic = false
    let after = false
    let before = false
    let value = new Date()
    for (const rule of rules) {
        const parts = getDateRuleType(rule)
        if (!parts) continue

        // If any child of parent rule is true, parent is true
        if (parts.dynamic) dynamic = true
        if (parts.after) after = true
        if (parts.before) before = true

        // Set value as the earliest date possible
        if (parts.value < value) value = parts.value
    }

    // If we have any before rules, we have to select all events ever
    value = before ? project.created_at : value

    return { dynamic, after, before, value }
}

export const duplicateRule = async (ruleId: number, projectId: number) => {
    const rule = await fetchAndCompileRule(ruleId)
    if (!rule) return

    const [{ id, ...wrapper }, ...rules] = decompileRule(rule, { project_id: projectId })
    const newRootUuid = uuid()
    const newRootId = await Rule.insert({ ...wrapper, uuid: newRootUuid })

    const uuidMap: Record<string, string> = {
        [rule.uuid]: newRootUuid,
    }
    if (rules && rules.length) {
        const newRules: Partial<Rule>[] = []
        for (const { id, ...rule } of rules) {
            const newUuid = uuid()
            uuidMap[rule.uuid] = newUuid
            newRules.push({
                ...rule,
                uuid: newUuid,
                root_uuid: newRootUuid,
                parent_uuid: rule.parent_uuid
                    ? uuidMap[rule.parent_uuid]
                    : undefined,
            })
        }
        await Rule.insert(newRules)
    }
    return newRootId
}
