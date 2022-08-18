import { UserEvent } from '../journey/UserEvent'
import { User } from '../models/User'
import { check } from '../rules/RuleEngine'
import List, { UserList } from './List'

const getUserListIds = async (user_id: number): Promise<number[]> => {
    const relations = await UserList.all(qb => qb.where('user_id', user_id))
    return relations.map(item => item.list_id)
}

export const updateLists = async (user: User, event: UserEvent) => {
    const lists = await List.all(qb => qb.where('project_id', user.project_id))
    const existingLists = await getUserListIds(user.id)
    for (const list of lists) {

        // TODO: Check that the user wasn't previously unsubscribed from list

        // Check to see if user condition matches list requirements
        const result = check({
            user: user.flatten(),
            event: event.flatten(),
        }, list.rules)

        // If check passes and user isn't already in the list, add
        if (result && !existingLists[list.id]) {

            await UserList.insert({
                user_id: user.id,
                list_id: list.id,
                event_id: event.id,
            })
        }
    }
}
