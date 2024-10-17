import { UserEvent } from '../users/UserEvent'
import { User } from '../users/User'
import { check } from '../rules/RuleEngine'
import List, { DynamicList, ListCreateParams, ListUpdateParams, UserList } from './List'
import Rule, { RuleEvaluation, RuleTree } from '../rules/Rule'
import { PageParams } from '../core/searchParams'
import ListPopulateJob from './ListPopulateJob'
import { importUsers } from '../users/UserImport'
import { FileStream } from '../storage/FileStream'
import { createTagSubquery, getTags, setTags } from '../tags/TagService'
import { Chunker, visit } from '../utilities'
import { getUserEventsForRules } from '../users/UserRepository'
import { RuleResults, RuleWithEvaluationResult, checkRules, decompileRule, fetchAndCompileRule, mergeInsertRules } from '../rules/RuleService'
import { cacheDecr, cacheIncr } from '../config/redis'
import App from '../app'

export const pagedLists = async (params: PageParams, projectId: number) => {
    const result = await List.search(
        { ...params, fields: ['name'] },
        b => {
            b = b.where('project_id', projectId)
                .whereNull('deleted_at')
                .where('is_visible', true)
            params.tag?.length && b.whereIn('id', createTagSubquery(List, projectId, params.tag))
            return b
        },
    )
    if (result.results?.length) {
        const tags = await getTags(List.tableName, result.results.map(l => l.id))
        for (const list of result.results) {
            list.tags = tags.get(list.id)
        }
    }
    return result
}

export const allLists = async (projectId: number, listIds?: number[]) => {
    const lists = await List.all(qb => {
        qb.where('project_id', projectId)
        if (listIds) {
            qb.whereIn('id', listIds)
        }
        return qb
    })

    if (lists.length) {
        const tags = await getTags(List.tableName, lists.map(l => l.id))
        for (const list of lists) {
            list.tags = tags.get(list.id)
        }
    }

    return lists
}

export const getList = async (id: number, projectId: number) => {
    const list = await List.find(id, qb => qb.where('project_id', projectId))
    if (list) {
        list.tags = await getTags(List.tableName, [list.id]).then(m => m.get(list.id))
        if (list.rule_id) list.rule = await fetchAndCompileRule(list.rule_id)
    }
    return list
}

export const getListUsers = async (id: number, params: PageParams, projectId: number) => {
    return await User.search(
        { ...params, fields: ['email', 'phone'], mode: 'exact' },
        b => b.rightJoin('user_list', 'user_list.user_id', 'users.id')
            .where('project_id', projectId)
            .where('list_id', id)
            .select('users.*', 'user_list.created_at'),
    )
}

export const getUserLists = async (id: number, params: PageParams, projectId: number) => {
    return await List.search(
        params,
        b => b.rightJoin('user_list', 'user_list.list_id', 'lists.id')
            .where('project_id', projectId)
            .where('user_id', id)
            .select('lists.*'),
    )
}

export const createList = async (projectId: number, { tags, name, type, rule }: ListCreateParams): Promise<List> => {
    const list = await List.insertAndFetch({
        name,
        type,
        state: type === 'dynamic' ? 'draft' : 'ready',
        users_count: 0,
        project_id: projectId,
    })

    if (tags?.length) {
        await setTags({
            project_id: projectId,
            entity: List.tableName,
            entity_id: list.id,
            names: tags,
        })
    }

    if (rule && list.type === 'dynamic') {
        // Decompile rule into separate flat parts
        const [wrapper, ...rules] = decompileRule(rule, { project_id: projectId })

        // Insert top level wrapper to get ID to associate
        list.rule_id = await Rule.insert(wrapper)
        await List.update(qb => qb.where('id', list.id), { rule_id: list.rule_id })

        // Insert rest of rules
        if (rules && rules.length) {
            await Rule.insert(rules)

            // If we have additional rules, populate
            await ListPopulateJob.from(list.id, list.project_id).queue()
        }
    }

    return list
}

export const updateList = async (list: List, { tags, rule, published, ...params }: ListUpdateParams): Promise<List | undefined> => {
    list = await List.updateAndFetch(list.id, {
        ...params,
        state: list.state === 'draft' ? published ? 'ready' : 'draft' : list.state,
    })

    if (tags) {
        await setTags({
            project_id: list.project_id,
            entity: List.tableName,
            entity_id: list.id,
            names: tags,
        })
    }

    if (rule && list.type === 'dynamic') {

        const rules = decompileRule(rule, { project_id: list.project_id })
        await mergeInsertRules(rules)
        await ListPopulateJob.from(list.id, list.project_id).queue()
    }

    return await getList(list.id, list.project_id)
}

export const archiveList = async (id: number, projectId: number) => {
    await List.archive(id, qb => qb.where('project_id', projectId))
    return getList(id, projectId)
}

export const deleteList = async (id: number, projectId: number) => {
    return await List.deleteById(id, qb => qb.where('project_id', projectId))
}

export const countKey = (list: List) => `list:${list.id}:${list.version}:count`

export const addUserToList = async (user: User | number, list: List, event?: UserEvent) => {
    const userId = user instanceof User ? user.id : user
    const count = await UserList.query()
        .insert({
            user_id: userId,
            list_id: list.id,
            event_id: event?.id ?? undefined,
            version: list.version,
        })
        .onConflict(['user_id', 'list_id'])
        .ignore()
    if (count) cacheIncr(App.main.redis, countKey(list))
    return count
}

export const removeUserFromList = async (user: User | number, list: List) => {
    const userId = user instanceof User ? user.id : user
    const count = await UserList.delete(qb =>
        qb.where('user_id', userId)
            .where('list_id', list.id),
    )
    if (count) cacheDecr(App.main.redis, countKey(list))
    return count
}

export const importUsersToList = async (list: List, stream: FileStream) => {
    await updateListState(list.id, { state: 'loading' })

    try {
        await importUsers({
            project_id: list.project_id,
            list_id: list!.id,
            stream,
        })
    } finally {
        await updateListState(list.id, { state: 'ready' })
    }

    await updateListState(list.id, { state: 'ready' })
}

export const populateList = async (list: List) => {
    const { id, version: oldVersion = 0, rule_id } = list
    const version = oldVersion + 1
    await updateListState(id, { state: 'loading', version })

    if (!rule_id) return

    const rule = await fetchAndCompileRule(rule_id) as RuleTree

    // Collect matching user ids, insert in batches of 100
    const userChunker = new Chunker<number>(async userIds => {
        await UserList.query()
            .insert(userIds.map(user_id => ({
                list_id: list.id,
                user_id,
                version,
            })))
            .onConflict(['user_id', 'list_id'])
            .merge(['version'])
    }, 100)

    // Collect rule evaluations, insert in batches of 100
    const ruleChunker = new Chunker<Partial<RuleEvaluation>>(async items => {
        await RuleEvaluation.query()
            .insert(items.map(({ user_id, rule_id, result }) => ({
                user_id,
                rule_id,
                result,
            })))
            .onConflict(['user_id', 'rule_id'])
            .merge(['result'])
    }, 100)

    // Fetch all users and iterate over them
    const scroll = User.scroll(q => q.where('project_id', list.project_id))

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

    for await (const users of scroll) {

        // For each user, evaluate parts and batch enqueue
        for (const user of users) {

            const parts: RuleWithEvaluationResult[] = []
            const events = await getUserEventsForRules([user.id], eventRules)

            for (const rule of eventRules) {
                const result = check({
                    user: user.flatten(),
                    events: events.map(e => e.flatten()),
                }, rule)
                await ruleChunker.add({
                    rule_id: rule.id,
                    user_id: user.id,
                    result,
                })
                parts.push({
                    ...rule,
                    result,
                })
            }

            const result = checkRules(user, rule, [...parts, ...userRules])
            if (result) {
                await userChunker.add(user.id)
            }
        }
    }

    // Insert any remaining users
    await ruleChunker.flush()
    await userChunker.flush()

    // Once list is regenerated, drop any users from previous version
    await UserList.delete(qb => qb
        .where('version', '<', version)
        .where('list_id', list.id))

    // Update list status to ready
    await updateListState(id, { state: 'ready' })
}

export const isUserInList = async (user_id: number, list_id: number) => {
    return await UserList.exists(qb => qb
        .where('user_id', user_id)
        .where('list_id', list_id),
    )
}

export const updateUsersLists = async (user: User, results: RuleResults, event?: UserEvent) => {

    if (results.success.length) {
        const successLists = await listsForRule(results.success, user.project_id)
        for (const list of successLists) {
            await addUserToList(user, list, event)
        }
    }

    if (results.failure.length) {
        const failureLists = await listsForRule(results.failure, user.project_id)
        for (const list of failureLists) {
            await removeUserFromList(user, list)
        }
    }
}

export const listsForRule = async (ruleUuids: string[], projectId: number): Promise<DynamicList[]> => {
    return await List.all(
        qb => qb.leftJoin('rules', 'rules.id', 'lists.rule_id')
            .where('lists.project_id', projectId)
            .where('rules.project_id', projectId)
            .where('lists.type', 'dynamic')
            .whereNot('lists.state', 'draft')
            .whereNull('deleted_at')
            .whereIn('rules.uuid', ruleUuids),
    ) as DynamicList[]
}

interface CountRange {
    sinceDate?: Date
    sinceId?: number
    untilId?: number
}

export const listUserCount = async (listId: number, since?: CountRange): Promise<number> => {
    return await UserList.count(qb => {
        qb.where('list_id', listId)
        if (since && since.sinceDate) {
            qb.where('created_at', '>=', since.sinceDate)
            if (since.sinceId && since.untilId) {
                qb.where('id', '>', since.sinceId)
                    .where('id', '<=', since.untilId)
            }
        }
        return qb
    })
}

export const updateListState = async (id: number, params: Partial<Pick<List, 'state' | 'version' | 'users_count'>>) => {
    return await List.updateAndFetch(id, params)
}
