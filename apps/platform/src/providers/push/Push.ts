import { BaseNotification } from '../../notifications/Notification'

export interface BasePush extends BaseNotification {
    topic: string
    silent: boolean
}

export interface Push extends BasePush {
    tokens: string | string[]
}

export interface PushResponse {
    push: Push
    success: boolean
    response?: string
    invalidTokens: string[]
}
