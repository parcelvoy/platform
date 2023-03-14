import { TextProvider } from '../providers/text/TextProvider'
import { ChannelType } from '../config/channels'
import { SearchParams } from '../core/searchParams'
import { paramsToEncodedLink, TrackedLinkParams } from '../render/LinkService'
import { User } from '../users/User'
import { createEvent } from '../events/UserEventRepository'
import { getUser, getUserFromPhone } from '../users/UserRepository'
import Subscription, { SubscriptionParams, SubscriptionState, UserSubscription } from './Subscription'

export const pagedSubscriptions = async (params: SearchParams, projectId: number) => {
    return await Subscription.searchParams(
        params,
        ['name', 'channel'],
        qb => qb.where('project_id', projectId),
    )
}

export const getUserSubscriptions = async (id: number, params: SearchParams, projectId: number) => {
    return await UserSubscription.searchParams(
        params,
        ['name', 'channel'],
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

export const subscriptionForChannel = async (channel: ChannelType, projectId: number): Promise<Subscription | undefined> => {
    return await Subscription.first(qb => qb.where('channel', channel).where('project_id', projectId))
}

export const unsubscribeSms = async (provider: TextProvider, body: Record<string, any>) => {

    const message = provider.parseInbound(body)

    // Get project ID from the matched channel
    const projectId = provider.project_id

    // Check if the message includes the word STOP
    if (message.text.toLowerCase().includes('stop')) {

        // Unsubscribe the user based on inbound SMS
        const user = await getUserFromPhone(projectId, message.from)
        const subscription = await subscriptionForChannel('text', projectId)
        if (user && subscription) {
            unsubscribe(user.id, subscription.id)
        }
    }
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
        await UserSubscription.update(qb => qb.where('id', previous.id), { state })
    } else {
        await UserSubscription.insert({
            ...condition,
            state,
        })
    }

    createEvent({
        project_id: user.project_id,
        user_id: user.id,
        name: state === SubscriptionState.unsubscribed
            ? 'unsubscribed'
            : 'subscribed',
        data: {
            project_id: user.project_id,
            subscription_id: subscription.id,
            subscription_name: subscription.name,
            channel: subscription.channel,
        },
    })
}

export const unsubscribe = async (userId: number, subscriptionId: number): Promise<void> => {
    toggleSubscription(userId, subscriptionId, SubscriptionState.unsubscribed)
}

export const subscribe = async (userId: number, subscriptionId: number): Promise<void> => {
    toggleSubscription(userId, subscriptionId, SubscriptionState.subscribed)
}

export const subscribeAll = async (user: User): Promise<void> => {
    const channels: ChannelType[] = []
    if (user.email) {
        channels.push('email')
    }
    if (user.phone) {
        channels.push('text')
    }
    if (user.pushEnabledDevices) {
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
