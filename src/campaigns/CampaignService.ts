import EmailJob from '../channels/email/EmailJob'
import TextJob from '../channels/text/TextJob'
import WebhookJob from '../channels/webhook/WebhookJob'
import { UserEvent } from '../users/UserEvent'
import { User } from '../users/User'
import Campaign, { CampaignParams } from './Campaign'
import { UserList } from '../lists/List'
import Subscription from '../subscriptions/Subscription'
import { RequestError } from '../core/errors'
import App from '../app'
import PushJob from '../channels/push/PushJob'
import { SearchParams } from '../core/searchParams'
import { listUserCount } from '../lists/ListService'
import { createTagSubquery } from '../tags/TagService'

export const pagedCampaigns = async (params: SearchParams, projectId: number) => {
    return await Campaign.searchParams(
        params,
        ['name'],
        b => {
            b.where({ project_id: projectId })
            params?.tags?.length && b.whereIn('id', createTagSubquery(Campaign, projectId, params.tags))
            return b
        },
    )
}

export const allCampaigns = async (projectId: number): Promise<Campaign[]> => {
    return await Campaign.all(qb => qb.where('project_id', projectId))
}

export const getCampaign = async (id: number, projectId: number): Promise<Campaign | undefined> => {
    return await Campaign.find(id, qb => qb.where('project_id', projectId))
}

export const createCampaign = async (projectId: number, params: CampaignParams): Promise<Campaign> => {
    const subscription = await Subscription.find(params.subscription_id)
    if (!subscription) {
        throw new RequestError('Unable to find associated subscription', 404)
    }

    const delivery = { sent: 0, total: 0 }
    if (params.list_id) {
        delivery.total = await listUserCount(params.list_id)
    }

    return await Campaign.insertAndFetch({
        ...params,
        state: 'ready',
        delivery,
        channel: subscription.channel,
        project_id: projectId,
    })
}

export const updateCampaign = async (id: number, params: Partial<CampaignParams>): Promise<Campaign | undefined> => {
    return await Campaign.updateAndFetch(id, params)
}

type SendCampaign = {
    (campaign: Campaign, user: User, event?: UserEvent): Promise<void>,
    (campaign: Campaign, userId: number, eventId?: number): Promise<void>,
}

export const sendCampaign: SendCampaign = async (campaign: Campaign, user: User | number, event?: UserEvent | number): Promise<void> => {

    // TODO: Might also need to check for unsubscribe in here since we can
    // do individual sends
    const body = {
        campaign_id: campaign.id,
        user_id: user instanceof User ? user.id : user,
        event_id: event instanceof UserEvent ? event?.id : event,
    }

    // TODO: Should filter out anyone who has already been through this
    // campaign before

    const channels = {
        email: EmailJob.from(body),
        text: TextJob.from(body),
        push: PushJob.from(body),
        webhook: WebhookJob.from(body),
    }

    await App.main.queue.enqueue(channels[campaign.channel])
}

export const sendList = async (campaign: Campaign) => {

    const updateProgress = async (params: Partial<Campaign>) => {
        await Campaign.update(qb => qb.where('id', campaign.id), params)
    }

    if (!campaign.list_id) {
        throw new RequestError('Unable to send to a campaign that does not have an associated list', 404)
    }

    const delivery = {
        sent: 0,
        total: await listUserCount(campaign.list_id),
    }

    await updateProgress({
        state: 'running',
        delivery,
    })

    // Stream results so that we aren't overwhelmed by millions
    // of potential entries
    await recipientQuery(campaign)
        .stream(async function(stream) {

            // For each result streamed back, process campaign send
            for await (const chunk of stream) {
                await sendCampaign(campaign, chunk.user_id)
                delivery.sent++

                if (delivery.sent % 20) {
                    await updateProgress({ delivery })
                }
            }

            // Once send is exhausted, update total to match send
            // Total may not match because list could have grown during send
            delivery.total = delivery.sent
        })

    await updateProgress({
        state: 'finished',
        delivery,
    })
}

export const recipientQuery = (campaign: Campaign) => {

    // Merge user subscription state in to filter out anyone
    // who we can't send do
    return UserList.query()
        .select('user_list.user_id')
        .where('list_id', campaign.list_id)
        .leftJoin('user_subscription', qb => {
            qb.on('user_list.user_id', 'user_subscription.user_id')
                .andOn('user_subscription.subscription_id', '=', UserList.raw(campaign.subscription_id))
        })
        .where(qb => {
            qb.whereNull('user_subscription.id')
                .orWhere('user_subscription.state', '>', 0)
        })
}
