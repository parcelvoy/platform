import Model from '../core/Model'

export type NotificationType = 'banner' | 'alert' | 'html'

export interface BaseNotification {
    title: string
    body: string
    custom: Record<string, string | number>
}

type BannerNotification = BaseNotification & { type: 'banner' }

interface StyledNotification extends BaseNotification {
    html: string
}

interface AlertNotification extends StyledNotification {
    type: 'alert'
    image?: string
}

interface HtmlNotification extends StyledNotification {
    type: 'html'
}

export type NotificationContent = BannerNotification | AlertNotification | HtmlNotification

export default class Notification extends Model {
    project_id!: number
    user_id!: number
    content_type!: NotificationType
    content!: NotificationContent
    read_at?: Date
    expires_at?: Date

    static jsonAttributes = ['content']
}
