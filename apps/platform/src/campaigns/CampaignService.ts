import EmailJob from '../channels/email/EmailJob'
import TextJob from '../channels/text/TextJob'
import WebhookJob from '../channels/webhook/WebhookJob'
import { UserEvent } from '../users/UserEvent'
import { User } from '../users/User'
import Campaign, { CampaignDelivery, CampaignParams, CampaignSend, CampaignSendParams, CampaignSendState, CampaignState, SentCampaign } from './Campaign'
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
import { pick } from '../utilities'
import { createTagSubquery, getTags, setTags } from '../tags/TagService'
import { getProject } from '../projects/ProjectService'

export const pagedCampaigns = async (params: SearchParams, projectId: number) => {
    const result = await Campaign.searchParams(
        params,
        ['name'],
        b => {
            b.where({ project_id: projectId }).orderBy('id', 'desc')
            params.tag?.length && b.whereIn('id', createTagSubquery(Campaign, projectId, params.tag))
            return b
        },
    )
    if (result.results?.length) {
        const tags = await getTags(Campaign.tableName, result.results.map(c => c.id))
        for (const campaign of result.results) {
            campaign.tags = tags.get(campaign.id)
        }
    }
    return result
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
        campaign.tags = await getTags(Campaign.tableName, [campaign.id]).then(m => m.get(campaign.id))
    }

    return campaign
}

export const createCampaign = async (projectId: number, { tags, ...params }: CampaignParams): Promise<Campaign> => {
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

    if (tags?.length) {
        await setTags({
            project_id: projectId,
            entity: Campaign.tableName,
            entity_id: id,
            names: tags,
        })
    }

    return await getCampaign(id, projectId) as Campaign
}

export const updateCampaign = async (id: number, projectId: number, { tags, ...params }: Partial<CampaignParams>): Promise<Campaign | undefined> => {

    const data: Partial<Campaign> = { ...params }

    // Calculate current state based on past properties
    if (params.send_at && data.state !== 'finished') {
        data.state = 'scheduled'
    } else {
        data.state = data.state === 'running' ? 'aborted' : 'draft'
    }

    await Campaign.update(qb => qb.where('id', id), {
        ...data,
    })

    if (tags) {
        await setTags({
            project_id: projectId,
            entity: Campaign.tableName,
            entity_id: id,
            names: tags,
        })
    }

    return getCampaign(id, projectId)
}

export const archiveCampaign = async (id: number, projectId: number) => {
    await Campaign.update(qb =>
        qb.where('id', id)
            .where('project_id', projectId),
    { deleted_at: new Date() },
    )
    return getCampaign(id, projectId)
}

export const deleteCampaign = async (id: number, projectId: number) => {
    return await Campaign.delete(qb => qb.where('id', id).where('project_id', projectId))
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
        .merge(['state'])
}

export const sendList = async (campaign: SentCampaign) => {

    const project = await getProject(campaign.project_id)
    if (!campaign.list_id || !project) {
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
    let chunk: CampaignSendParams[] = []
    await recipientQuery(campaign)
        .stream(async function(stream) {

            // Create records of the send in a pending state
            // Once sent, each record will be updated accordingly
            const chunkSize = 100
            let i = 0
            for await (const { user_id, timezone } of stream) {
                chunk.push({
                    user_id,
                    campaign_id: campaign.id,
                    state: 'pending',
                    send_at: campaign.send_in_user_timezone
                        ? utcToZonedTime(campaign.send_at, timezone ?? project.timezone)
                        : campaign.send_at,
                })
                i++
                if (i % chunkSize === 0) {
                    await insertChunk(chunk)
                    chunk = []
                }
            }
        })
        .then(async function() {
            // Insert remaining items
            await insertChunk(chunk)
        })
}

export const campaignSendReadyQuery = () => {
    return CampaignSend.query()
        .where('campaign_sends.send_at', '<', CampaignSend.raw('NOW()'))
        .where('campaign_sends.state', 'pending')
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

export const campaignProgress = async (campaign: Campaign): Promise<CampaignDelivery> => {
    const progress = await CampaignSend.first(
        qb => qb.where('campaign_id', campaign.id)
            .select(CampaignSend.raw("SUM(IF(state = 'sent', 1, 0)) AS sent, COUNT(*) AS total")),
    ) as any
    return {
        sent: parseInt(progress.sent),
        total: parseInt(progress.total),
    }
}

export const updateCampaignProgress = async (
    id: number,
    projectId: number,
    state: CampaignState,
    delivery: CampaignDelivery,
): Promise<void> => {
    await Campaign.update(qb => qb.where('id', id).where('project_id', projectId), { state, delivery })
}
