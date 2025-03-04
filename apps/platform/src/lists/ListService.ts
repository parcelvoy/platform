import { UserEvent } from '../users/UserEvent'
import { User } from '../users/User'
import { check } from '../rules/RuleEngine'
import List, { DynamicList, ListCreateParams, ListProgress, ListUpdateParams, ListVersion, UserList } from './List'
import Rule, { RuleEvaluation, RuleTree } from '../rules/Rule'
import { PageParams } from '../core/searchParams'
import ListPopulateJob from './ListPopulateJob'
import { importUsers } from '../users/UserImport'
import { FileStream } from '../storage/FileStream'
import { createTagSubquery, getTags, setTags } from '../tags/TagService'
import { Chunker, pick } from '../utilities'
import { getUserEventsForRules } from '../users/UserRepository'
import { DateRuleTypes, RuleResults, RuleWithEvaluationResult, checkRules, decompileRule, duplicateRule, fetchAndCompileRule, getDateRuleType, mergeInsertRules, splitRuleTree } from '../rules/RuleService'
import { updateCampaignSendEnrollment } from '../campaigns/CampaignService'
import { cacheDecr, cacheDel, cacheGet, cacheIncr, cacheSet } from '../config/redis'
import App from '../app'
import { RequestError } from '../core/errors'
import RuleError from '../rules/RuleError'
import ListEvaluateUserJob from './ListEvaluateUserJob'
import ListStatsJob from './ListStatsJob'
import { PassThrough } from 'stream'

export const CacheKeys = {
    memberCount: (list: ListVersion) => `list:${list.id}:${list.version}:count`,
    populationProgress: (list: ListVersion) => `list:${list.id}:${list.version}:progress`,
    populationTotal: (list: ListVersion) => `list:${list.id}:${list.version}:total`,
}

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
        if (list.state === 'loading') {
            list.progress = await populationProgress(list)
        }
    }
    return list
}

export const getListUsers = async (id: number, params: PageParams, projectId: number) => {
    return await UserList.search(
        { ...params, fields: ['email', 'phone'], mode: 'exact' },
        b => b.leftJoin('users', 'user_list.user_id', 'users.id')
            .where('project_id', projectId)
            .where('list_id', id)
            .select('users.*', 'user_list.created_at', 'user_list.id', 'user_list.user_id'),
        App.main.db,
        (item) => User.fromJson({ ...item, id: item.user_id }) as any,
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

        // Check if there are any date rules to start the list refresh scheduler
        const isDynamic = rules.some(rule => getDateRuleType(rule)?.dynamic)
        list.refreshed_at = isDynamic ? new Date() : null

        // Insert top level wrapper to get ID to associate
        list.rule_id = await Rule.insert(wrapper)

        // Update list with new settings
        await List.update(qb => qb.where('id', list.id), {
            rule_id: list.rule_id,
            refreshed_at: list.refreshed_at,
        })

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
        state: list.state === 'draft'
            ? published
                ? 'ready'
                : 'draft'
            : list.state,
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

        // Modify the rule data structure to match modifications
        await mergeInsertRules(rules)

        // Check if there are any date rules to start the list refresh scheduler
        try {
            const isDynamic = rules.some(rule => getDateRuleType(rule)?.dynamic)
            list.refreshed_at = isDynamic ? new Date() : null
            await List.update(qb => qb.where('id', list.id), {
                refreshed_at: list.refreshed_at,
            })
        } catch (error: any) {
            throw new RequestError(RuleError.CompileError(error.message))
        }

        // Start repopulation of the list if state is published
        if (list.state !== 'draft') {
            await updateListState(list.id, { state: 'loading' })
            await ListPopulateJob.from(list.id, list.project_id).queue()
        }
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

export const addUserToList = async (user: User | number, list: ListVersion, event?: UserEvent) => {
    const userId = user instanceof User ? user.id : user
    const resp = await UserList.query()
        .insert({
            user_id: userId,
            list_id: list.id,
            event_id: event?.id ?? undefined,
            version: list.version,
        })
        .onConflict(['user_id', 'list_id'])
        .ignore()
    if (resp?.[0]) await cacheIncr(App.main.redis, CacheKeys.memberCount(list))
    return resp
}

export const removeUserFromList = async (user: User | number, list: List) => {
    const userId = user instanceof User ? user.id : user
    const count = await UserList.delete(qb =>
        qb.where('user_id', userId)
            .where('list_id', list.id),
    )
    if (count) await cacheDecr(App.main.redis, CacheKeys.memberCount(list))
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

interface UserListEventEvaluation {
    rule_id: number
    user_id: number
    result: boolean
}

interface UserListEvaluation {
    list: List
    stream: PassThrough & AsyncIterable<unknown>
    since?: Date | null
    handleRule: (evaluation: UserListEventEvaluation) => Promise<void>
    handleEntry: (user: User, result: boolean) => Promise<void>
}

const streamUserListForEvaluation = async ({
    list,
    stream,
    since,
    handleRule,
    handleEntry,
}: UserListEvaluation) => {
    if (!list.rule_id) return
    const rule = await fetchAndCompileRule(list.rule_id) as RuleTree
    const { eventRules, userRules } = splitRuleTree(rule)

    // For each user, evaluate parts and batch enqueue
    for await (const rawUser of stream) {
        const user = User.fromJson(rawUser)

        const parts: RuleWithEvaluationResult[] = []
        const events = await getUserEventsForRules([user.id], eventRules, since)

        for (const rule of eventRules) {
            const result = check({
                user: user.flatten(),
                events: events.map(e => e.flatten()),
            }, rule)
            await handleRule({
                rule_id: rule.id!,
                user_id: user.id,
                result,
            })
            parts.push({
                ...rule,
                result,
            })
        }

        const result = checkRules(user, rule, [...parts, ...userRules])
        await handleEntry(user, result)
    }
}

export const evaluateUserList = async (user: User, list: DynamicList) => {
    const rule = await fetchAndCompileRule(list.rule_id) as RuleTree
    const { eventRules, userRules } = splitRuleTree(rule)

    const parts: RuleWithEvaluationResult[] = []
    const events = await getUserEventsForRules([user.id], eventRules)

    for (const rule of eventRules) {
        const result = check({
            user: user.flatten(),
            events: events.map(e => e.flatten()),
        }, rule)

        await RuleEvaluation.query()
            .insert({
                rule_id: rule.id!,
                user_id: user.id,
                result,
            })
            .onConflict(['user_id', 'rule_id'])
            .merge(['result'])

        parts.push({
            ...rule,
            result,
        })
    }

    const result = checkRules(user, rule, [...parts, ...userRules])

    if (result) {
        await UserList.query()
            .insert({
                list_id: list.id,
                user_id: user.id,
                version: list.version,
            })
            .onConflict(['user_id', 'list_id'])
            .merge(['version'])
    }
}

export const populateList = async (list: List) => {
    const { id, version: oldVersion = 0 } = list
    const version = oldVersion + 1
    list = await updateListState(id, { state: 'loading', version })

    // Set the total in cache so we can start to calculate progress
    const count = await User.count(q => q.where('project_id', list.project_id))
    await cacheSet<number>(App.main.redis, CacheKeys.populationTotal(list), count, 86400)

    const stream = User.query()
        .where('project_id', list.project_id)
        .stream()

    // Enqueue batches of 100 jobs at a time for efficiency
    const userChunker = new Chunker<ListEvaluateUserJob>(async jobs => {
        await App.main.queue.enqueueBatch(jobs)
    }, 100)

    for await (const user of stream) {
        await userChunker.add(
            ListEvaluateUserJob.from({
                listId: list.id,
                userId: user.id,
                projectId: list.project_id,
                version,
                totalCount: count,
            }),
        )
    }

    await userChunker.flush()
}

export const populationProgress = async (list: List): Promise<ListProgress> => {
    return {
        complete: await cacheGet<number>(App.main.redis, CacheKeys.populationProgress(list)) ?? 0,
        total: await cacheGet<number>(App.main.redis, CacheKeys.populationTotal(list)) ?? 0,
    }
}

export const cleanupList = async ({ id, project_id, version }: List) => {

    // Once list is regenerated, drop any users from previous version
    await UserList.delete(qb => qb
        .where('version', '<', version)
        .where('list_id', id))

    // Update list status to ready
    await updateListState(id, { state: 'ready' })

    // Clear cache values
    await cacheDel(App.main.redis, CacheKeys.populationTotal({ id, version }))

    await ListStatsJob.from(id, project_id, true).queue()
}

export const refreshList = async (list: List, types: DateRuleTypes) => {

    // If there are any rules that compare before a dynamic date
    // then we cant optimize and need to regenerate the entire list
    if (types.before) {
        return await populateList(list)
    }

    const { id } = list
    await updateListState(id, { state: 'loading' })

    const stream = UserList.query()
        .leftJoin('users', 'user_list.user_id', 'users.id')
        .where('project_id', list.project_id)
        .where('list_id', list.id)
        .select('users.*')
        .stream()

    const userChunker = new Chunker<number>(async userIds => {
        await UserList.delete(qb => qb.whereIn('user_id', userIds)
            .where('list_id', list.id))
        await cacheDecr(App.main.redis, CacheKeys.memberCount(list), userIds.length)
    }, 50)

    await streamUserListForEvaluation({
        list,
        stream,
        since: types.value,
        handleRule: async ({ rule_id, user_id, result }) => {
            if (!result) {
                await RuleEvaluation.update(
                    qb => qb
                        .where('rule_id', rule_id)
                        .where('user_id', user_id),
                    { result },
                )
            }
        },
        handleEntry: async (user, result) => {
            if (!result) await userChunker.add(user.id)
        },
    })

    await userChunker.flush()

    // Update list status to ready
    await updateListState(id, { state: 'ready', refreshed_at: new Date() })
}

export const isUserInList = async (user_id: number, list_id: number) => {
    return await UserList.exists(qb => qb
        .where('user_id', user_id)
        .where('list_id', list_id),
    )
}

export const updateUsersLists = async (user: User, results: RuleResults, event?: UserEvent) => {

    const dirtyLists = new Set<number>()
    if (results.success.length) {
        const successLists = await listsForRule(results.success, user.project_id)
        for (const list of successLists) {
            await addUserToList(user, list, event)
            dirtyLists.add(list.id)
        }
    }

    if (results.failure.length) {
        const failureLists = await listsForRule(results.failure, user.project_id)
        for (const list of failureLists) {
            await removeUserFromList(user, list)
            dirtyLists.add(list.id)
        }
    }

    // If any lists were updated for the user, check associated campaigns
    // to see if send list needs to be updated
    if (dirtyLists.size > 0) {
        await updateCampaignSendEnrollment(user)
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

export const updateListState = async (id: number, params: Partial<Pick<List, 'state' | 'version' | 'users_count' | 'refreshed_at'>>) => {
    return await List.updateAndFetch(id, params)
}

export const duplicateList = async (list: List) => {
    const params: Partial<List> = pick(list, ['project_id', 'name', 'type', 'rule_id', 'rule', 'is_visible'])
    params.name = `Copy of ${params.name}`
    params.state = 'draft'
    let newList = await List.insertAndFetch(params)

    if (list.rule_id) {
        const clonedRuleId = await duplicateRule(list.rule_id, newList.project_id)
        if (clonedRuleId) newList.rule_id = clonedRuleId

        newList = await List.updateAndFetch(newList.id, { rule_id: clonedRuleId })

        await ListPopulateJob.from(newList.id, newList.project_id).queue()

        return newList
    } else {
        const chunker = new Chunker<Partial<UserList>>(async entries => {
            await UserList.insert(entries)
        }, 100)
        const stream = UserList.query()
            .where('list_id', list.id)
            .stream()
        for await (const row of stream) {
            await chunker.add({
                list_id: newList.id,
                user_id: row.user_id,
                event_id: row.event_id,
            })
        }
        await chunker.flush()
        return newList
    }
}
