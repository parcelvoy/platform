import EmailJob from '../channels/email/EmailJob'
import TextJob from '../channels/text/TextJob'
import WebhookJob from '../channels/webhook/WebhookJob'
import { UserEvent } from '../users/UserEvent'
import { User } from '../users/User'
import Campaign, { CampaignParams, CampaignSend, CampaignSendParams, CampaignSendState, SentCampaign } from './Campaign'
import { UserList } from '../lists/List'
import Subscription from '../subscriptions/Subscription'
import { RequestError } from '../core/errors'
import App from '../app'
import PushJob from '../channels/push/PushJob'
import { SearchParams } from '../core/searchParams'
import { getList, listUserCount } from '../lists/ListService'
import { allTemplates, duplicateTemplate } from '../render/TemplateService'
import { utcToZonedTime } from 'date-fns-tz'
import { getSubscription } from '../subscriptions/SubscriptionService'
import { getProvider } from '../channels/ProviderRepository'
import { isFuture } from 'date-fns'
import { pick } from '../utilities'

export const pagedCampaigns = async (params: SearchParams, projectId: number) => {
    return await Campaign.searchParams(
        params,
        ['name'],
        b => b.where({ project_id: projectId }),
    )
}

export const allCampaigns = async (projectId: number): Promise<Campaign[]> => {
    return await Campaign.all(qb => qb.where('project_id', projectId))
}

export const getCampaign = async (id: number, projectId: number): Promise<Campaign | undefined> => {
    const campaign = await Campaign.find(id, qb => qb.where('project_id', projectId))

    if (campaign) {
        campaign.templates = await allTemplates(projectId, campaign.id)
        campaign.list = campaign.list_id ? await getList(campaign.list_id, projectId) : undefined
        campaign.subscription = await getSubscription(campaign.subscription_id, projectId)
        campaign.provider = await getProvider(campaign.provider_id, projectId)
    }

    return campaign
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

    const id = await Campaign.insert({
        ...params,
        state: 'draft',
        delivery,
        channel: subscription.channel,
        project_id: projectId,
    })

    return await getCampaign(id, projectId) as Campaign
}

export const updateCampaign = async (id: number, projectId: number, params: Partial<CampaignParams>): Promise<Campaign | undefined> => {

    const data: Partial<Campaign> = { ...params }

    // Calculate current state based on past properties
    if (params.send_at && data.state !== 'finished') {
        data.state = isFuture(new Date(params.send_at)) ? 'scheduled' : 'running'
    } else {
        data.state = data.state === 'running' ? 'aborted' : 'draft'
    }

    await Campaign.update(qb => qb.where('id', id), {
        ...data,
    })

    return getCampaign(id, projectId)
}

export const getCampaignUsers = async (id: number, params: SearchParams, projectId: number) => {
    return await User.searchParams(
        params,
        ['email', 'phone'],
        b => b.rightJoin('campaign_sends', 'campaign_sends.user_id', 'users.id')
            .where('project_id', projectId)
            .where('campaign_id', id)
            .select('users.*', 'state', 'send_at'),
    )
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

export const updateSendState = async (campaign: Campaign | number, user: User | number, state: CampaignSendState = 'sent') => {
    const userId = user instanceof User ? user.id : user
    const campaignId = campaign instanceof Campaign ? campaign.id : campaign

    return await CampaignSend.query()
        .insert({
            user_id: userId,
            campaign_id: campaignId,
            state,
        })
        .onConflict(['user_id', 'list_id'])
        .ignore()
}

export const sendList = async (campaign: SentCampaign) => {

    if (!campaign.list_id) {
        throw new RequestError('Unable to send to a campaign that does not have an associated list', 404)
    }

    // Update campaign state to show it's processing
    await Campaign.update(qb => qb.where('id', campaign.id), {
        state: 'running',
        delivery: {
            sent: 0,
            total: await listUserCount(campaign.list_id),
        },
    })

    const insertChunk = async (chunk: CampaignSendParams[]) => {
        return await CampaignSend.query()
            .insert(chunk)
            .onConflict(['user_id', 'list_id'])
            .ignore()
    }

    // Stream results so that we aren't overwhelmed by millions
    // of potential entries
    await recipientQuery(campaign)
        .stream(async function(stream) {

            // Create records of the send in a pending state
            // Once sent, each record will be updated accordingly
            const chunkSize = 100
            let chunk: CampaignSendParams[] = []
            let i = 0
            for await (const { id, timezone } of stream) {
                chunk.push({
                    user_id: id,
                    campaign_id: campaign.id,
                    state: 'pending',
                    send_at: campaign.send_in_user_timezone
                        ? utcToZonedTime(campaign.send_at, timezone)
                        : campaign.send_at,
                })
                i++
                if (i % chunkSize === 0) {
                    await insertChunk(chunk)
                    chunk = []
                }
            }

            // Insert remaining items
            await insertChunk(chunk)
        })
}

export const campaignSendReadyQuery = () => {
    return CampaignSend.query()
        .where('send_at', '<', Date.now())
        .where('state', 'pending')
        .leftJoin('campaigns', 'campaigns.id', '=', 'campaign_sends.campaign_id')
        .select('user_id', 'campaigns.*')
}

export const recipientQuery = (campaign: Campaign) => {

    // Merge user subscription state in to filter out anyone
    // who we can't send do
    return UserList.query()
        .select('user_list.user_id', 'users.timezone')
        .where('list_id', campaign.list_id)
        .leftJoin('user_subscription', qb => {
            qb.on('user_list.user_id', 'user_subscription.user_id')
                .andOn('user_subscription.subscription_id', '=', UserList.raw(campaign.subscription_id))
        })
        .leftJoin('users', 'users.id', '=', 'user_list.user_id')
        .where(qb => {
            qb.whereNull('user_subscription.id')
                .orWhere('user_subscription.state', '>', 0)
        })
}

export const duplicateCampaign = async (campaign: Campaign) => {
    const params: Partial<Campaign> = pick(campaign, ['project_id', 'list_id', 'provider_id', 'subscription_id', 'channel', 'name'])
    params.name = `Copy of ${params.name}`
    params.state = 'draft'
    const cloneId = await Campaign.insert(params)
    for (const template of campaign.templates) {
        await duplicateTemplate(template, cloneId)
    }
    return await getCampaign(cloneId, campaign.project_id)
}
