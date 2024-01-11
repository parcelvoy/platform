import { User } from '../users/User'
import Notification, { NotificationContent } from './Notification'

export const getNotifications = async (user: User, cursor?: string) => {
    return Notification.search({ limit: 25, cursor }, qb =>
        qb.where('project_id', user.project_id).where('user_id', user.id),
    )
}

export const readNotification = async (user: User, id: number) => {
    await Notification.update(
        qb =>
            qb.where('id', id)
                .where('project_id', user.project_id)
                .where('user_id', user.id),
        { read_at: new Date() },
    )
}

export const createNotification = async (user: User, content: NotificationContent): Promise<Notification> => {
    return await Notification.insertAndFetch({
        project_id: user.project_id,
        user_id: user.id,
        content_type: content.type,
        content,
    })
}
