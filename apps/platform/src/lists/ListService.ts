import { UserEvent } from '../users/UserEvent'
import { User } from '../users/User'
import { check, query as ruleQuery } from '../rules/RuleEngine'
import List, { ListCreateParams, UserList } from './List'
import Rule from '../rules/Rule'
import { enterJourneyFromList } from '../journey/JourneyService'
import { SearchParams } from '../core/searchParams'
import App from '../app'
import ListPopulateJob from './ListPopulateJob'
import { importUsers } from '../users/UserImport'
import { FileStream } from '../storage/FileStream'
import { createTagSubquery, getTags, setTags } from '../tags/TagService'

export const pagedLists = async (params: SearchParams, projectId: number) => {
    const result = await List.searchParams(
        params,
        ['name'],
        b => {
            b = b.where('project_id', projectId)
                .whereNull('deleted_at')
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

export const getListUsers = async (id: number, params: SearchParams, projectId: number) => {
    return await User.searchParams(
        params,
        ['email', 'phone'],
        b => b.rightJoin('user_list', 'user_list.user_id', 'users.id')
            .where('project_id', projectId)
            .where('list_id', id)
            .select('users.*'),
    )
}

export const getUserLists = async (id: number, params: SearchParams, projectId: number) => {
    return await List.searchParams(
        params,
        [],
        b => b.rightJoin('user_list', 'user_list.list_id', 'lists.id')
            .where('project_id', projectId)
            .where('user_id', id)
            .select('lists.*'),
    )
}

export const createList = async (projectId: number, { tags, ...params }: ListCreateParams): Promise<List> => {
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
        App.main.queue.enqueue(
            ListPopulateJob.from(list.id, list.project_id),
        )
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
        App.main.queue.enqueue(
            ListPopulateJob.from(list.id, list.project_id),
        )
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

    await importUsers({
        project_id: list.project_id,
        list_id: list!.id,
        stream,
    })

    await updateList(list.id, { state: 'ready' })
}

export const populateList = async (list: List, rule: Rule) => {
    const { id, version: oldVersion } = list
    const version = oldVersion + 1
    await updateList(id, { state: 'loading', version })

    type UserListChunk = { user_id: number, list_id: number, version: number }[]
    const insertChunk = async (chunk: UserListChunk) => {
        return await UserList.query()
            .insert(chunk)
            .onConflict(['user_id', 'list_id'])
            .merge(['version'])
    }

    await ruleQuery(rule)
        .where('users.project_id', list.project_id)
        .stream(async function(stream) {

            // Stream results and insert in chunks of 100
            const chunkSize = 100
            let chunk: UserListChunk = []
            let i = 0
            for await (const { id: user_id } of stream) {
                chunk.push({ user_id, list_id: id, version })
                i++
                if (i % chunkSize === 0) {
                    await insertChunk(chunk)
                    chunk = []
                }
            }

            // Insert remaining items
            await insertChunk(chunk)
        })

    // Once list is regenerated, drop any users from previous version
    await UserList.delete(qb => qb
        .where('version', '<', version)
        .where('list_id', list.id))

    await updateList(id, { state: 'ready' })
}

const getUsersListIds = async (user_id: number): Promise<number[]> => {
    const relations = await UserList.all(qb => qb.where('user_id', user_id))
    return relations.map(item => item.list_id)
}

export const updateUsersLists = async (user: User, event?: UserEvent) => {
    const lists = await List.all(qb => qb.where('project_id', user.project_id))
    const existingLists = await getUsersListIds(user.id)

    for (const list of lists) {

        if (!list.rule) continue

        // Check to see if user condition matches list requirements
        const result = check({
            user: user.flatten(),
            event: event?.flatten(),
        }, list.rule)

        // If check passes and user isn't already in the list, add
        if (result && !existingLists.includes(list.id)) {

            await addUserToList(user, list, event)

            // Find all associated journeys based on list and enter user
            await enterJourneyFromList(list, user, event)
        }
    }
}

export const listUserCount = async (listId: number | number[]): Promise<number> => {
    const lists = Array.isArray(listId) ? listId : [listId]
    return await UserList.count(qb => qb.whereIn('list_id', lists))
}
