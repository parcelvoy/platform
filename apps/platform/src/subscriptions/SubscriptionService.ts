import { ChannelType } from '../config/channels'
import { PageParams } from '../core/searchParams'
import { paramsToEncodedLink, TrackedLinkParams } from '../render/LinkService'
import { User } from '../users/User'
import { getUser, updateUser } from '../users/UserRepository'
import Subscription, { SubscriptionParams, SubscriptionState, UserSubscription } from './Subscription'
import App from '../app'
import { combineURLs, encodeHashid } from '../utilities'
import { EventPostJob } from '../jobs'
import { SearchResult } from '../core/Model'

export const pagedSubscriptions = async (params: PageParams, projectId: number) => {
    return await Subscription.search(
        { ...params, fields: ['name', 'channel'] },
        qb => qb.where('project_id', projectId),
    )
}

export const getUserSubscriptions = async (user: User, params?: PageParams, onlyPublic = true): Promise<SearchResult<UserSubscription>> => {
    const subscriptions = await Subscription.all(
        qb => {
            qb.where('project_id', user.project_id)
            if (onlyPublic) qb.where('is_public', true)
            return qb
        },
    )
    return {
        results: subscriptions.map(subscription => ({
            name: subscription.name,
            channel: subscription.channel,
            state: user.subscriptionState(subscription.id),
            subscription_id: subscription.id,
        })),
        limit: params?.limit ?? 25,
    }
}

export const getUserSubscriptionState = async (user: User | number, subscriptionId: number) => {
    const fetchedUser = user instanceof User ? user : await getUser(user)
    if (!fetchedUser) return SubscriptionState.subscribed
    return fetchedUser?.subscriptionState(subscriptionId)
}

export const isUserUnsubscribed = async (user: User | number, subscriptionId: number): Promise<boolean> => {
    const state = await getUserSubscriptionState(user, subscriptionId)
    return state === SubscriptionState.unsubscribed
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

    // If previous exists, user is unsubscribed
    let ids = user.unsubscribe_ids || []
    if (state === SubscriptionState.unsubscribed) {
        ids = [...new Set([...ids, subscription.id])]
    }
    if (state === SubscriptionState.subscribed) {
        ids = ids.filter(id => id !== subscription.id)
    }
    if (ids.length !== user.unsubscribe_ids?.length) {
        await updateUser(user, {
            unsubscribe_ids: ids,
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

export const unsubscribeEmailLink = (params: TrackedLinkParams): string => {
    return paramsToEncodedLink({ ...params, path: 'unsubscribe/email' })
}

export const preferencesLink = (userId: number) => {
    return combineURLs([App.main.env.baseUrl, 'unsubscribe/preferences', encodeHashid(userId)])
}
