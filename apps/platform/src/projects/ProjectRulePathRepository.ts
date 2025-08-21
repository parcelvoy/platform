import { PageParams } from '../core/searchParams'
import { GetProjectRulePath, ProjectRulePath, RulePathVisibility } from '../rules/ProjectRulePath'
import { KeyedSet } from '../utilities'

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
