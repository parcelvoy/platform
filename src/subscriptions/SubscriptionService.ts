import { User } from '../users/User'
import { combineURLs } from '../utilities'
import { SubscriptionState, UserSubscription } from './Subscription'

export const unsubscribe = async (userId: number, subscriptionId: number): Promise<void> => {
    const condition = {
        user_id: userId,
        subscription_id: subscriptionId,
    }
    const previous = await UserSubscription.first(qb => qb.where(condition))
    if (previous) {
        UserSubscription.update(qb => qb.where('id', previous.id), { state: SubscriptionState.unsubscribed })
    } else {
        UserSubscription.insert({
            ...condition,
            state: SubscriptionState.unsubscribed,
        })
    }
}

export const unsubscribeLink = (user: User, campaignId: number): string => {
    return combineURLs([process.env.BASE_URL!, String(user.id), String(campaignId)])
}
