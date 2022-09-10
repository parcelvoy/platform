import { ChannelType } from '../config/channels'
import Model from '../core/Model'

export default class Subscription extends Model {
    project_id!: number
    name!: string
    channel!: ChannelType
}

export enum SubscriptionState {
    unsubscribed = 0,
    subscribed = 1,
    optedIn = 2,
}

export class UserSubscription extends Model {
    subscription_id!: number
    user_id!: number
    state!: SubscriptionState

    static tableName = 'user_subscription'
}
