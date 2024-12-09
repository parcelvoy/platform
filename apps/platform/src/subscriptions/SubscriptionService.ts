import { ChannelType } from '../config/channels'
import { PageParams } from '../core/searchParams'
import { paramsToEncodedLink, TrackedLinkParams } from '../render/LinkService'
import { User } from '../users/User'
import { getUser } from '../users/UserRepository'
import Subscription, { SubscriptionParams, SubscriptionState, UserSubscription } from './Subscription'
import App from '../app'
import { combineURLs, encodeHashid } from '../utilities'
import { EventPostJob } from '../jobs'

export const pagedSubscriptions = async (params: PageParams, projectId: number) => {
    return await Subscription.search(
        { ...params, fields: ['name', 'channel'] },
        qb => qb.where('project_id', projectId),
    )
}

export const getUserSubscriptions = async (id: number, params: PageParams, projectId: number) => {
    return await UserSubscription.search(
        { ...params, fields: ['name', 'channel'] },
        b => b.leftJoin('subscriptions', 'subscriptions.id', 'user_subscription.subscription_id')
            .where('project_id', projectId)
            .where('user_id', id)
            .select(
                'user_subscription.id',
                'user_subscription.subscription_id',
                'subscriptions.name',
                'subscriptions.channel',
                'user_subscription.state',
                'user_subscription.created_at',
                'user_subscription.updated_at',
            ),
    )
}

export const getUserSubscriptionState = async (userId: number, subscriptionId: number) => {
    const subscription = await UserSubscription.first(qb => qb.where('user_id', userId).where('subscription_id', subscriptionId))
    return subscription?.state ?? SubscriptionState.subscribed
}

export const allSubscriptions = async (projectId: number, channels?: ChannelType[]) => {
    return await Subscription.all(
        qb => {
            if (channels) {
                qb.whereIn('channel', channels)
            }
            return qb.where('project_id', projectId)
        },
    )
}

export const getSubscription = async (id: number, projectId: number) => {
    return await Subscription.find(id, qb => qb.where('project_id', projectId))
}

export const createSubscription = async (projectId: number, params: SubscriptionParams): Promise<Subscription> => {
    return await Subscription.insertAndFetch({
        ...params,
        project_id: projectId,
    })
}

export const updateSubscription = async (id: number, params: Partial<SubscriptionParams>): Promise<Subscription> => {
    return await Subscription.updateAndFetch(id, params)
}

export const subscriptionsForChannel = async (channel: ChannelType, projectId: number): Promise<Subscription[]> => {
    return await Subscription.all(qb => qb.where('channel', channel).where('project_id', projectId))
}

export const toggleSubscription = async (userId: number, subscriptionId: number, state = SubscriptionState.unsubscribed): Promise<void> => {

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
        if (previous.state === state) {
            return
        } else {
            await UserSubscription.update(qb => qb.where('id', previous.id), { state })
        }
    } else {
        await UserSubscription.insert({
            ...condition,
            state,
        })
    }

    await EventPostJob.from({
        project_id: user.project_id,
        user_id: user.id,
        event: {
            name: state === SubscriptionState.unsubscribed
                ? 'unsubscribed'
                : 'subscribed',
            external_id: user.external_id,
            data: {
                project_id: user.project_id,
                subscription_id: subscription.id,
                subscription_name: subscription.name,
                channel: subscription.channel,
            },
        },
    }).queue()
}

export const toggleChannelSubscriptions = async (projectId: number, user: User, channel: ChannelType, state = SubscriptionState.unsubscribed) => {
    const subscriptions = await subscriptionsForChannel(channel, projectId)
    for (const subscription of subscriptions) {
        await toggleSubscription(user.id, subscription.id, state)
    }
}

export const unsubscribe = async (userId: number, subscriptionId: number): Promise<void> => {
    await toggleSubscription(userId, subscriptionId, SubscriptionState.unsubscribed)
}

export const subscribe = async (userId: number, subscriptionId: number): Promise<void> => {
    await toggleSubscription(userId, subscriptionId, SubscriptionState.subscribed)
}

export const subscribeAll = async (user: User, types = ['email', 'text', 'push']): Promise<void> => {
    const channels: ChannelType[] = []
    if (user.email && types.includes('email')) {
        channels.push('email')
    }
    if (user.phone && types.includes('text')) {
        channels.push('text')
    }
    if (user.pushEnabledDevices.length && types.includes('push')) {
        channels.push('push')
    }
    const subscriptions = await allSubscriptions(user.project_id, channels)
    for (const subscription of subscriptions) {
        await subscribe(user.id, subscription.id)
    }
}

export const unsubscribeEmailLink = (params: TrackedLinkParams): string => {
    return paramsToEncodedLink({ ...params, path: 'unsubscribe/email' })
}

export const preferencesLink = (userId: number) => {
    return combineURLs([App.main.env.baseUrl, 'unsubscribe/preferences', encodeHashid(userId)])
}
