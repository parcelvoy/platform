import App from '../app'
import { cacheGet, cacheSet } from '../config/redis'
import { Rule, RuleTree } from './Rule'

export type RuleResults = { success: string[], failure: string[] }

const CacheKeys = {
    ruleTree: (rootId: number) => `rule_tree:${rootId}`,
}

/**
 * For a given root ID value of a rule set, find all children and compile
 * into a nested tree structure.
 */
export const fetchAndCompileRule = async (rootId: number): Promise<RuleTree> => {

    const cache = await cacheGet<RuleTree>(App.main.redis, CacheKeys.ruleTree(rootId))
    if (cache) return cache

    const root = await App.main.db('rule').where('id', rootId).first()
    if (!root) throw new Error(`Rule with ID ${rootId} not found`)

    const rules = await App.main.db('rule').where('root_uuid', root!.uuid)
    const compiled = compileRule(root, rules)
    await cacheSet(App.main.redis, CacheKeys.ruleTree(rootId), compiled, 3600)
    return compiled
}

export const compileRule = (root: Rule, rules: Rule[]): RuleTree => {
    const build = ({ uuid, ...rest }: Rule): RuleTree => {
        const children = rules.filter(rule => rule.parent_uuid === uuid)
        return {
            ...rest,
            uuid,
            children: children.map(build),
        }
    }

    return build(root)
}
