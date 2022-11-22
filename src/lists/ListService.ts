import { UserEvent } from '../users/UserEvent'
import { User } from '../users/User'
import { check } from '../rules/RuleEngine'
import List, { ListParams, UserList } from './List'
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
        b => b.where({ project_id: projectId }),
    )
}

export const allLists = async (projectId: number) => {
    return await List.all(qb => qb.where('project_id', projectId))
}

export const getList = async (id: number, projectId: number) => {
    return await List.find(id, qb => qb.where('project_id', projectId))
}

export const createList = async (projectId: number, params: ListParams): Promise<List> => {
    return await List.insertAndFetch({
        ...params,
        project_id: projectId,
    })
}

export const addUserToList = async (user: User, list: List, event?: UserEvent) => {
    return await UserList.insert({
        user_id: user.id,
        list_id: list.id,
        event_id: event?.id ?? undefined,
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
