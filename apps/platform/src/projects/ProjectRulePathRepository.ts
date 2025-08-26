import jsonpath from 'jsonpath'
import { PageParams } from '../core/searchParams'
import { GetProjectRulePath, ProjectRulePath, RulePathVisibility } from '../rules/ProjectRulePath'
import { KeyedSet } from '../utilities'
import { userPathForQuery } from '../rules/RuleHelpers'

type PagedRulePathParams = {
    search: PageParams,
    projectId: number,
    visibilities: RulePathVisibility[]
}
export const pagedUserRulePaths = async ({ search, projectId, visibilities }: PagedRulePathParams) => {
    return await ProjectRulePath.search(
        search,
        q => q.where('project_id', projectId)
            .whereIn('visibility', visibilities)
            .where('type', 'user'),
    )
}

export const pagedEventRulePaths = async ({ search, projectId, visibilities }: PagedRulePathParams) => {
    return await ProjectRulePath.search(
        search,
        q => q.where('project_id', projectId)
            .whereIn('visibility', visibilities)
            .where('type', 'event')
            .groupBy('name')
            .select('name'),
    )
}

export const updateRulePath = async (id: number, visibility: RulePathVisibility) => {
    return await ProjectRulePath.update(qb => qb.where('id', id), { visibility })
}

type RulePaths = {
    userPaths: KeyedSet<GetProjectRulePath>,
    eventPaths: { [name: string]: KeyedSet<GetProjectRulePath> }
}
export const getRulePaths = async (
    projectId: number,
    visibilities: RulePathVisibility[] = ['public'],
): Promise<RulePaths> => {
    const rulePaths = await ProjectRulePath.all(q => q
        .where('project_id', projectId)
        .whereIn('visibility', visibilities)
        .select('path', 'type', 'name', 'data_type', 'visibility'),
    )

    return rulePaths.reduce((a, rulePath) => {
        const { path, type, name, data_type } = rulePath
        if (type === 'event' && name) {
            if (!a.eventPaths[name]) {
                const set = new KeyedSet<GetProjectRulePath>(item => item.path)
                set.add({ path, type, name, data_type })
                a.eventPaths[name] = set
            } else {
                a.eventPaths[name].add({ path, type, name, data_type })
            }
        } else {
            a.userPaths.add({ path, type, name, data_type })
        }
        return a
    }, {
        userPaths: new KeyedSet<GetProjectRulePath>(item => item.path),
        eventPaths: {},
    } as RulePaths)
}

export const filterObjectForRulePaths = async <T extends Record<string, any>>(obj: T, projectId: number, visibilities: RulePathVisibility[] = ['public']) => {
    const rulePaths = await ProjectRulePath.all(q => q
        .where('project_id', projectId)
        .whereNotIn('visibility', visibilities)
        .select('path', 'type', 'name', 'data_type', 'visibility'),
    )

    return removeByJsonPaths(obj, rulePaths.map(rp => rp.path))
}

type PathToken = string | number
type PathTask = {
    parentPath: PathToken[]
    key: PathToken
}
const removeByJsonPaths = <T extends Record<string, any>>(obj: T, paths: string[]): T => {
    const list = paths.map(p => userPathForQuery(p))
    const tasks: PathTask[] = []

    // Collect concrete matches up front so indices don't shift during deletion
    for (const p of list) {
        const nodes = jsonpath.nodes(obj as unknown as object, p) as Array<{ path: PathToken[] }>
        for (const { path } of nodes) {
            if (!path || path.length <= 1) continue
            tasks.push({
                parentPath: path.slice(0, -1),
                key: path[path.length - 1],
            })
        }
    }

    // For items under the same parent array, delete higher indices first.
    // Otherwise, delete shallower parents first.
    const parentKey = (x: PathTask) => x.parentPath.join('|')
    tasks.sort((a, b) => {
        const aP = parentKey(a)
        const bP = parentKey(b)
        if (aP === bP && typeof a.key === 'number' && typeof b.key === 'number') {
            return b.key - a.key
        }
        return a.parentPath.length - b.parentPath.length
    })

    // Perform deletions
    for (const t of tasks) {
        let parent: any = obj
        // Walk from '$' to the parent container
        for (let i = 1; i < t.parentPath.length; i++) {
            if (parent == null) break
            parent = parent[t.parentPath[i] as any]
        }
        if (parent == null) continue

        if (Array.isArray(parent) && typeof t.key === 'number') {
            const idx = t.key
            if (idx >= 0 && idx < parent.length) parent.splice(idx, 1)
        } else {
            if (Object.prototype.hasOwnProperty.call(parent, t.key)) delete parent[t.key as any]
        }
    }

    return obj
}
