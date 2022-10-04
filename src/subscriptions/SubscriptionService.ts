import { ChannelType } from '../config/channels'
import { User } from '../users/User'
import { createEvent } from '../users/UserEventRepository'
import { getUser } from '../users/UserRepository'
import { combineURLs, encodeHashid } from '../utilities'
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

export const subscriptionForChannel = async (channel: ChannelType, projectId: number): Promise<Subscription | undefined> => {
    return await Subscription.first(qb => qb.where('channel', channel).where('project_id', projectId))
}

export const unsubscribe = async (userId: number, subscriptionId: number): Promise<void> => {

    // Ensure both user and subscription exist
    const user = await getUser(userId)
    if (!user) return

    const subscription = await getSubscription(subscriptionId, user.project_id)
    if (!subscription) return

    const condition = {
        user_id: user.id,
        subscription_id: subscription.id,
    }

    // If subscription exists, unsubscribe, otherwise subscribe
    const previous = await UserSubscription.first(qb => qb.where(condition))
    if (previous) {
        await UserSubscription.update(qb => qb.where('id', previous.id), { state: SubscriptionState.unsubscribed })
    } else {
        await UserSubscription.insert({
            ...condition,
            state: SubscriptionState.unsubscribed,
        })
    }

    createEvent({
        project_id: user.project_id,
        user_id: user.id,
        name: previous ? 'unsubscribed' : 'subscribed',
        data: {
            project_id: user.project_id,
            subscription_id: subscription.id,
            subscription_name: subscription.name,
            channel: subscription.channel,
        },
    })
}

export const unsubscribeLink = (user: User, campaignId: number): string => {
    const hashUserId = encodeHashid(user.id)
    const hashCampaignId = encodeHashid(campaignId)
    return combineURLs([process.env.BASE_URL!, 'unsubscribe', hashUserId, hashCampaignId])
}
