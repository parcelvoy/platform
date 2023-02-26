import { SearchParams } from '../core/searchParams'
import { UserEvent, UserEventParams } from './UserEvent'

export const createEvent = async (event: UserEventParams): Promise<UserEvent> => {
    return await UserEvent.insertAndFetch(event)
}

export const getUserEvents = async (id: number, params: SearchParams, projectId: number) => {
    return await UserEvent.searchParams(
        params,
        ['name'],
        b => b.where('project_id', projectId)
            .where('user_id', id)
            .orderBy('id', 'desc'),
    )
}
