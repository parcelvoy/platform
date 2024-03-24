import { PageParams } from '../core/searchParams'
import { loadAnalytics } from '../providers/analytics'
import { User } from '../users/User'
import { UserEvent, UserEventParams } from './UserEvent'

export const createEvent = async (
    user: User,
    { name, data }: UserEventParams,
    forward = true,
    filter = (data: Record<string, unknown>) => data,
): Promise<number> => {
    const id = await UserEvent.insert({
        name,
        data,
        project_id: user.project_id,
        user_id: user.id,
    })

    if (forward) {
        const analytics = await loadAnalytics(user.project_id)
        analytics.track({
            external_id: user.external_id,
            anonymous_id: user.anonymous_id,
            name,
            data: filter(data),
        })
    }
    return id
}

export const createAndFetchEvent = async (user: User, event: UserEventParams, forward = false): Promise<UserEvent> => {
    const id = await createEvent(user, event, forward)
    const userEvent = await UserEvent.find(id)
    return userEvent!
}

export const getUserEvents = async (id: number, params: PageParams, projectId: number) => {
    return await UserEvent.search(
        { ...params, fields: ['name'] },
        b => b.where('project_id', projectId)
            .where('user_id', id)
            .orderBy('id', 'desc'),
    )
}
