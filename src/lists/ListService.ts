import { UserEvent } from '../users/UserEvent'
import { User } from '../users/User'
import { check, query as ruleQuery } from '../rules/RuleEngine'
import List, { ListParams, UserList } from './List'
import Rule from '../rules/Rule'
import { enterJourneyFromList } from '../journey/JourneyService'
import { SearchParams } from '../core/searchParams'

const getUserListIds = async (user_id: number): Promise<number[]> => {
    const relations = await UserList.all(qb => qb.where('user_id', user_id))
    return relations.map(item => item.list_id)
}

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

export const createList = async (projectId: number, params: ListParams): Promise<List> => {
    return await List.insertAndFetch({
        ...params,
        project_id: projectId,
    })
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
    await ruleQuery(rule)
        .stream(async function(stream) {

            // Stream results and insert in chunks of 100
            const chunkSize = 100
            let chunk = []
            let i = 0
            for await (const { id: user_id } of stream) {
                chunk.push({ user_id, rule_id: id })
                i++
                if (i % chunkSize === 0) {
                    await UserList.insert(chunk)
                    chunk = []
                }
            }

            // Insert remaining items
            await UserList.insert(chunk)
        })
}

export const updateLists = async (user: User, event?: UserEvent) => {
    const lists = await List.all(qb => qb.where('project_id', user.project_id))
    const existingLists = await getUserListIds(user.id)

    for (const list of lists) {

        // Check to see if user condition matches list requirements
        const result = check({
            user: user.flatten(),
            event: event?.flatten(),
        }, list.rules)

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
