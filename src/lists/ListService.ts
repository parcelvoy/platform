import { UserEvent } from '../users/UserEvent'
import { User } from '../users/User'
import { check, query as ruleQuery } from '../rules/RuleEngine'
import List, { ListCreateParams, UserList } from './List'
import Rule from '../rules/Rule'
import { enterJourneyFromList } from '../journey/JourneyService'
import { SearchParams } from '../core/searchParams'
import App from '../app'
import ListPopulateJob from './ListPopulateJob'

export const pagedLists = async (params: SearchParams, projectId: number) => {
    return await List.searchParams(
        params,
        ['name'],
        b => b.where('project_id', projectId),
    )
}

export const allLists = async (projectId: number) => {
    return await List.all(qb => qb.where('project_id', projectId))
}

export const getList = async (id: number, projectId: number) => {
    return await List.find(id, qb => qb.where('project_id', projectId))
}

export const getListUsers = async (id: number, params: SearchParams, projectId: number) => {
    return await User.searchParams(
        params,
        ['email', 'phone'],
        b => b.rightJoin('user_list', 'user_list.user_id', 'users.id')
            .where('project_id', projectId)
            .where('list_id', id),
    )
}

export const getUserLists = async (id: number, params: SearchParams, projectId: number) => {
    return await List.searchParams(
        params,
        [],
        b => b.rightJoin('user_list', 'user_list.list_id', 'lists.id')
            .where('project_id', projectId)
            .where('user_id', id),
    )
}

export const createList = async (projectId: number, params: ListCreateParams): Promise<List> => {
    const list = await List.insertAndFetch({
        ...params,
        project_id: projectId,
    })

    if (list.type === 'dynamic') {
        App.main.queue.enqueue(
            ListPopulateJob.from(list.id, list.project_id),
        )
    }

    return list
}

export const updateList = async (id: number, params: Partial<List>): Promise<List | undefined> => {
    const list = await List.updateAndFetch(id, params)

    if (params.rule && list.type === 'dynamic') {
        App.main.queue.enqueue(
            ListPopulateJob.from(list.id, list.project_id),
        )
    }

    return list
}

export const addUserToList = async (user: User | number, list: List | number, event?: UserEvent) => {
    const userId = user instanceof User ? user.id : user
    const listId = list instanceof List ? list.id : list
    return await UserList.insert({
        user_id: userId,
        list_id: listId,
        event_id: event?.id ?? undefined,
    })
}

export const populateList = async (id: number, rule: Rule) => {
    const list = await updateList(id, { state: 'loading' })

    type UserListChunk = { user_id: number, list_id: number }[]
    const insertChunk = async (chunk: UserListChunk) => {
        return await UserList.query()
            .insert(chunk)
            .onConflict(['user_id', 'list_id'])
            .ignore()
    }

    await ruleQuery(rule)
        .where('users.project_id', list!.project_id)
        .stream(async function(stream) {

            // Stream results and insert in chunks of 100
            const chunkSize = 100
            let chunk: UserListChunk = []
            let i = 0
            for await (const { id: user_id } of stream) {
                chunk.push({ user_id, list_id: id })
                i++
                if (i % chunkSize === 0) {
                    await insertChunk(chunk)
                    chunk = []
                }
            }

            // Insert remaining items
            await insertChunk(chunk)
        })
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

export const listUserCount = async (listId: number): Promise<number> => {
    return await UserList.count(qb => qb.where('list_id', listId))
}
