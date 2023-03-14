import App from '../app'
import { SearchParams } from '../core/searchParams'
import { User } from '../users/User'
import { UserEvent, UserEventParams } from './UserEvent'

export const createEvent = async (user: User, event: UserEventParams): Promise<number> => {
    const data = {
        project_id: user.project_id,
        user_id: user.id,
        ...event,
    }
    const id = await UserEvent.insert(data)
    await App.main.analytics.track({
        external_id: user.external_id,
        ...event,
    })
    return id
}

export const createAndFetchEvent = async (user: User, event: UserEventParams): Promise<UserEvent> => {
    const id = await createEvent(user, event)
    const userEvent = await UserEvent.find(id)
    return userEvent!
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
