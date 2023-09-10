import { UserEvent } from '../users/UserEvent'
import { User } from '../users/User'
import { check } from '../rules/RuleEngine'
import List, { DynamicList, ListCreateParams, UserList } from './List'
import Rule from '../rules/Rule'
import { enterJourneysFromList } from '../journey/JourneyService'
import { PageParams } from '../core/searchParams'
import App from '../app'
import ListPopulateJob from './ListPopulateJob'
import { importUsers } from '../users/UserImport'
import { FileStream } from '../storage/FileStream'
import { createTagSubquery, getTags, setTags } from '../tags/TagService'
import { Chunker, groupBy } from '../utilities'
import { getUserEventsForRules } from '../users/UserRepository'

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

export const createList = async (projectId: number, { tags, syncJourneys, ...params }: ListCreateParams): Promise<List> => {
    const list = await List.insertAndFetch({
        ...params,
        state: 'ready',
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

    const hasRules = (params.rule?.children?.length ?? 0) > 0
    if (list.type === 'dynamic' && hasRules) {
        await ListPopulateJob.from(list.id, list.project_id).queue()
    }

    return list
}

export const updateList = async (id: number, { tags, ...params }: Partial<List>): Promise<List | undefined> => {
    const list = await List.updateAndFetch(id, params)

    if (tags) {
        await setTags({
            project_id: list.project_id,
            entity: List.tableName,
            entity_id: list.id,
            names: tags,
        })
    }

    if (params.rule && list.type === 'dynamic') {
        await ListPopulateJob.from(list.id, list.project_id).queue()
    }

    return list
}

export const archiveList = async (id: number, projectId: number) => {
    await List.update(qb =>
        qb.where('id', id)
            .where('project_id', projectId),
    { deleted_at: new Date() },
    )
    return getList(id, projectId)
}

export const deleteList = async (id: number, projectId: number) => {
    return await List.delete(qb => qb.where('id', id).where('project_id', projectId))
}

export const addUserToList = async (user: User | number, list: List | number, event?: UserEvent) => {
    const userId = user instanceof User ? user.id : user
    const listId = list instanceof List ? list.id : list
    return await UserList.query()
        .insert({
            user_id: userId,
            list_id: listId,
            event_id: event?.id ?? undefined,
        })
        .onConflict(['user_id', 'list_id'])
        .ignore()
}

export const importUsersToList = async (list: List, stream: FileStream) => {
    await updateList(list.id, { state: 'loading' })

    try {
        await importUsers({
            project_id: list.project_id,
            list_id: list!.id,
            stream,
        })
    } finally {
        await updateList(list.id, { state: 'ready' })
    }

    await updateList(list.id, { state: 'ready' })
}

export const populateList = async (list: List, rule: Rule) => {
    const { id, version: oldVersion = 0 } = list
    const version = oldVersion + 1
    await updateList(id, { state: 'loading', version })

    // collect matching user ids, insert in batches of 100
    const chunker = new Chunker<number>(async userIds => {
        await UserList.query()
            .insert(userIds.map(user_id => ({
                list_id: list.id,
                user_id,
                version,
            })))
            .onConflict(['user_id', 'list_id'])
            .merge(['version'])
    }, 100)

    for await (const users of User.scroll(q => q.where('project_id', list.project_id))) {
        const events = await getUserEventsForRules(users.map(u => u.id), [rule])
            .then(events => groupBy(events, e => e.user_id))
        for (const user of users) {
            const matched = check({
                user: user.flatten(),
                events: events.get(user.id)?.map(e => e.flatten()) ?? [],
            }, rule)
            if (matched) {
                chunker.add(user.id)
            }
        }
    }

    // insert any remaining users
    await chunker.flush()

    // Once list is regenerated, drop any users from previous version
    await UserList.delete(qb => qb
        .where('version', '<', version)
        .where('list_id', list.id))

    // update list status to ready
    await updateList(id, { state: 'ready' })
}

export const isUserInList = async (user_id: number, list_id: number) => {
    return await UserList.exists(qb => qb
        .where('user_id', user_id)
        .where('list_id', list_id),
    )
}

const getUsersListIds = async (user_id: number): Promise<number[]> => {
    const relations = await UserList.all(qb => qb.where('user_id', user_id))
    return relations.map(item => item.list_id)
}

export const updateUsersLists = async (user: User, event?: UserEvent) => {
    let lists = await List.all(
        qb => qb.where('project_id', user.project_id)
            .whereNotNull('rule'),
    ) as DynamicList[]
    const existingLists = await getUsersListIds(user.id)

    lists = lists.filter(list => !existingLists.includes(list.id))

    if (!lists.length) return

    const events = await getUserEventsForRules([user.id], lists.map(list => list.rule))

    for (const list of lists) {

        // Check to see if user condition matches list requirements
        await checkList(list, existingLists, user, events, event)
    }
}

export const checkList = async (
    list: DynamicList,
    existingLists: number[],
    user: User,
    events: UserEvent[],
    event?: UserEvent,
) => {
    try {
        const result = check({
            user: user.flatten(),
            events,
        }, list.rule)

        // If check passes and user isn't already in the list, add
        if (result && !existingLists.includes(list.id)) {

            await addUserToList(user, list, event)

            // Find all associated journeys based on list and enter user
            await enterJourneysFromList(list, user, event)
        }
    } catch (error: any) {
        App.main.error.notify(error)
    }
}

export const listUserCount = async (listId: number, since?: Date): Promise<number> => {
    return await UserList.count(qb => {
        qb.where('list_id', listId)
        if (since) {
            qb.where('created_at', '>=', since)
        }
        return qb
    })
}
