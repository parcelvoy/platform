import App from '../app'
import { PageParams } from '../core/searchParams'
import { loadAnalytics } from '../providers/analytics'
import { User } from '../users/User'
import { uuid } from '../utilities'
import { UserEvent, UserEventParams } from './UserEvent'

export const createEvent = async (
    user: User,
    { name, distinct_id, data }: UserEventParams,
    forward = true,
    filter = (data: Record<string, unknown>) => data,
): Promise<number | undefined> => {
    const id = await UserEvent.insert({
        name,
        data,
        project_id: user.project_id,
        user_id: user.id,
        distinct_id: distinct_id ?? uuid(),
    }, App.main.db, qb => qb.onConflict(['distinct_id']).ignore())

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

export const createAndFetchEvent = async (user: User, event: UserEventParams, forward = false): Promise<UserEvent | undefined> => {
    const id = await createEvent(user, event, forward)
    if (!id) return
    return await UserEvent.find(id)
}

export const getUserEvents = async (id: number, params: PageParams, projectId: number) => {
    return await UserEvent.search(
        { ...params, fields: ['name'] },
        b => b.where('project_id', projectId)
            .where('user_id', id)
            .orderBy('id', 'desc'),
    )
}
