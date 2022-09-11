import { User } from '../users/User'
import { combineURLs } from '../utilities'
import Subscription, { SubscriptionParams, SubscriptionState, UserSubscription } from './Subscription'

export const allSubscriptions = async (projectId: number) => {
    return await Subscription.all(qb => qb.where('project_id', projectId))
}

export const getSubscription = async (id: number, projectId: number) => {
    return await Subscription.find(id, qb => qb.where('project_id', projectId))
}

export const createSubscription = async (params: SubscriptionParams): Promise<Subscription> => {
    return await Subscription.insertAndFetch(params)
}

export const unsubscribe = async (userId: number, subscriptionId: number): Promise<void> => {
    const condition = {
        user_id: userId,
        subscription_id: subscriptionId,
    }
    const previous = await UserSubscription.first(qb => qb.where(condition))
    if (previous) {
        await UserSubscription.update(qb => qb.where('id', previous.id), { state: SubscriptionState.unsubscribed })
    } else {
        await UserSubscription.insert({
            ...condition,
            state: SubscriptionState.unsubscribed,
        })
    }
}

export const unsubscribeLink = (user: User, campaignId: number): string => {
    return combineURLs([process.env.BASE_URL!, String(user.id), String(campaignId)])
}
