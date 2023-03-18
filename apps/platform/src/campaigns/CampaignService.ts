import PushJob from '../providers/push/PushJob'
import WebhookJob from '../providers/webhook/WebhookJob'
import TextJob from '../providers/text/TextJob'
import EmailJob from '../providers/email/EmailJob'
import { User } from '../users/User'
import { UserEvent } from '../users/UserEvent'
import Campaign, { CampaignCreateParams, CampaignDelivery, CampaignParams, CampaignProgress, CampaignSend, CampaignSendParams, CampaignSendState, CampaignState, SentCampaign } from './Campaign'
import { UserList } from '../lists/List'
import Subscription from '../subscriptions/Subscription'
import { RequestError } from '../core/errors'
import App from '../app'

import { SearchParams } from '../core/searchParams'
import { allLists, listUserCount } from '../lists/ListService'
import { allTemplates, duplicateTemplate, validateTemplates } from '../render/TemplateService'
import { utcToZonedTime } from 'date-fns-tz'
import { getSubscription } from '../subscriptions/SubscriptionService'
import { pick } from '../utilities'
import { getProvider } from '../providers/ProviderRepository'
import { createTagSubquery, getTags, setTags } from '../tags/TagService'
import { getProject } from '../projects/ProjectService'
import CampaignError from './CampaignError'

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
        campaign.lists = campaign.list_ids ? await allLists(projectId, campaign.list_ids) : []
        campaign.exclusion_lists = campaign.exclusion_list_ids ? await allLists(projectId, campaign.exclusion_list_ids) : []
        campaign.subscription = await getSubscription(campaign.subscription_id, projectId)
        campaign.provider = await getProvider(campaign.provider_id, projectId)
        campaign.tags = await getTags(Campaign.tableName, [campaign.id]).then(m => m.get(campaign.id))
    }

    return campaign
}

export const createCampaign = async (projectId: number, { tags, ...params }: CampaignCreateParams): Promise<Campaign> => {
    const subscription = await Subscription.find(params.subscription_id)
    if (!subscription) {
        throw new RequestError('Unable to find associated subscription', 404)
    }

    const delivery = { sent: 0, total: 0 }
    if (params.list_ids) {
        delivery.total = await totalUsersCount(
            params.list_ids,
            params.exclusion_list_ids ?? [],
        )
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

    // Ensure finished campaigns are no longer modified
    const campaign = await getCampaign(id, projectId) as Campaign
    if (campaign.state === 'finished') {
        throw new RequestError(CampaignError.CampaignFinished)
    }

    const data: Partial<Campaign> = { ...params }

    // If we are aborting, reset `send_at`
    if (data.state === 'aborted') {
        data.send_at = undefined
        await abortCampaign(campaign)
    }

    // If we are rescheduling, abort sends to they are reset
    if (data.send_at !== campaign.send_at) {
        data.state = 'pending'
        await abortCampaign(campaign)
    }

    // Check templates to make sure we can schedule a send
    if (data.state === 'scheduled') {
        await validateTemplates(projectId, id)

        // Set to pending if success so scheduling starts
        data.state = 'pending'
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

    return await getCampaign(id, projectId)
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

    // TODO: Create a `campaign_send` record for users coming through
    // this path

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

export const generateSendList = async (campaign: SentCampaign) => {

    const project = await getProject(campaign.project_id)
    if (!campaign.list_ids || !project) {
        throw new RequestError('Unable to send to a campaign that does not have an associated list', 404)
    }

    // Update campaign state to show it's processing
    await Campaign.update(qb => qb.where('id', campaign.id), {
        delivery: {
            sent: 0,
            total: await totalUsersCount(
                campaign.list_ids,
                campaign.exclusion_list_ids ?? [],
            ),
        },
    })

    const insertChunk = async (chunk: CampaignSendParams[]) => {
        if (chunk.length <= 0) return
        return await CampaignSend.query()
            .insert(chunk)
            .onConflict(['user_id', 'list_id'])
            .merge(['state', 'send_at'])
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

            await Campaign.update(qb => qb.where('id', campaign.id), { state: 'scheduled' })
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

    return UserList.query()
        .select('user_list.user_id', 'users.timezone')

        // Join user subscriptions to filter out unsubscribes
        .leftJoin('user_subscription', qb => {
            qb.on('user_list.user_id', 'user_subscription.user_id')
                .andOn('user_subscription.subscription_id', '=', UserList.raw(campaign.subscription_id))
        })

        // Join users to get the timezone field
        .leftJoin('users', 'users.id', 'user_list.user_id')

        // Join previous campaign successful sends
        .leftJoin('campaign_sends', qb => {
            qb.on('campaign_sends.user_id', 'user_list.user_id')
                .andOn('campaign_sends.campaign_id', '=', UserList.raw(campaign.id))
                .andOn('campaign_sends.state', '=', UserList.raw('"sent"'))
        })

        // Allow users with no preference or explicit preference
        .where(qb => {
            qb.whereNull('user_subscription.id')
                .orWhere('user_subscription.state', '>', 0)
        })

        // Find all users in provided lists, removing ones in exclusion list
        .whereIn('list_id', campaign.list_ids ?? [])
        .whereNotIn('list_id', campaign.exclusion_list_ids ?? [])

        // Filter out existing sends (handle aborts & reschedules)
        .whereNull('campaign_sends.id')
}

export const abortCampaign = async (campaign: Campaign) => {
    await CampaignSend.query()
        .where('campaign_id', campaign.id)
        .where('state', 'pending')
        .update({ state: 'aborted' })
}

export const duplicateCampaign = async (campaign: Campaign) => {
    const params: Partial<Campaign> = pick(campaign, ['project_id', 'list_ids', 'exclusion_list_ids', 'provider_id', 'subscription_id', 'channel', 'name'])
    params.name = `Copy of ${params.name}`
    params.state = 'draft'
    const cloneId = await Campaign.insert(params)
    for (const template of campaign.templates) {
        await duplicateTemplate(template, cloneId)
    }
    return await getCampaign(cloneId, campaign.project_id)
}

const totalUsersCount = async (listIds: number[], exclusionListIds: number[]): Promise<number> => {
    const totalIncluded = await listUserCount(listIds)
    const totalExcluded = await listUserCount(exclusionListIds)
    return Math.max(0, (totalIncluded - totalExcluded))
}

export const campaignProgress = async (campaign: Campaign): Promise<CampaignProgress> => {
    const progress = await CampaignSend.query()
        .where('campaign_id', campaign.id)
        .select(CampaignSend.raw("SUM(IF(state = 'sent', 1, 0)) AS sent, SUM(IF(state = 'pending', 1, 0)) AS pending, COUNT(*) AS total"))
        .first()
    return {
        sent: parseInt(progress.sent),
        pending: parseInt(progress.pending),
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
