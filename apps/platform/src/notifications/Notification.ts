import Model from '../core/Model'

export type NotificationType = 'banner' | 'alert' | 'html'

export interface BaseNotification {
    title: string
    body: string
    custom: Record<string, string | number>
}

type BannerNotification = BaseNotification & { type: 'banner' }

interface AlertNotification extends BaseNotification {
    type: 'alert'
    image?: string
}

interface HtmlNotification extends BaseNotification {
    type: 'html'
    html: string
    custom: Record<string, string | number>
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
