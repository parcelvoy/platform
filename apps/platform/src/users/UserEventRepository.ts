import { SearchParams } from '../core/searchParams'
import { loadAnalytics } from '../providers/analytics'
import { User } from '../users/User'
import { UserEvent, UserEventParams } from './UserEvent'

export const createEvent = async (user: User, event: UserEventParams, forward = true): Promise<number> => {
    const data = {
        project_id: user.project_id,
        user_id: user.id,
        ...event,
    }
    const id = await UserEvent.insert(data)

    if (forward) {
        const analytics = await loadAnalytics(user.project_id)
        analytics.track({
            external_id: user.external_id,
            ...event,
        })
    }
    return id
}

export const createAndFetchEvent = async (user: User, event: UserEventParams, forward = false): Promise<UserEvent> => {
    const id = await createEvent(user, event, forward)
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
