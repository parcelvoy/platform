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
import { PageParams } from '../core/searchParams'
import { allLists } from '../lists/ListService'
import { allTemplates, duplicateTemplate, screenshotHtml, templateInUserLocale, validateTemplates } from '../render/TemplateService'
import { getSubscription } from '../subscriptions/SubscriptionService'
import { crossTimezoneCopy, pick } from '../utilities'
import { getProvider } from '../providers/ProviderRepository'
import { createTagSubquery, getTags, setTags } from '../tags/TagService'
import { getProject } from '../projects/ProjectService'
import CampaignError from './CampaignError'
import CampaignGenerateListJob from './CampaignGenerateListJob'
import Project from '../projects/Project'
import Template from '../render/Template'

export const pagedCampaigns = async (params: PageParams, projectId: number) => {
    const result = await Campaign.search(
        { ...params, fields: ['name'] },
        b => {
            b.where('project_id', projectId)
                .whereNull('deleted_at')
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

    const delivery = { sent: 0, total: 0, opens: 0, clicks: 0 }
    const campaign = await Campaign.insertAndFetch({
        ...params,
        state: params.type === 'trigger' ? 'running' : 'draft',
        delivery,
        channel: subscription.channel,
        project_id: projectId,
    })

    // Calculate initial users count
    await Campaign.update(qb => qb.where('id', campaign.id), {
        delivery: {
            ...campaign.delivery,
            total: await initialUsersCount(campaign),
        },
    })

    if (tags?.length) {
        await setTags({
            project_id: projectId,
            entity: Campaign.tableName,
            entity_id: campaign.id,
            names: tags,
        })
    }

    return await getCampaign(campaign.id, projectId) as Campaign
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
    if (data.send_at && data.send_at !== campaign.send_at) {
        data.state = 'pending'
        await abortCampaign(campaign)
    }

    // Check templates to make sure we can schedule a send
    if (data.state === 'scheduled') {
        await validateTemplates(projectId, id)

        // Set to pending if success so scheduling starts
        data.state = 'pending'
    }

    // If this is a trigger campaign, should always be running
    if (data.type === 'trigger') {
        data.state = 'running'
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

    if (data.state === 'pending' && data.type === 'blast') {
        await CampaignGenerateListJob.from(campaign).queue()
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

export const getCampaignUsers = async (id: number, params: PageParams, projectId: number) => {
    return await User.search(
        { ...params, fields: ['email', 'phone'], mode: 'exact' },
        b => b.rightJoin('campaign_sends', 'campaign_sends.user_id', 'users.id')
            .where('project_id', projectId)
            .where('campaign_id', id)
            .select('users.*', 'state', 'send_at', 'opened_at', 'clicks'),
    )
}

interface SendCampaign {
    campaign: Campaign
    user: User | number
    event?: UserEvent | number
    send_id?: number
}

export const sendCampaign = async ({ campaign, user, event, send_id }: SendCampaign): Promise<void> => {

    // TODO: Might also need to check for unsubscribe in here since we can
    // do individual sends
    const body = {
        campaign_id: campaign.id,
        user_id: user instanceof User ? user.id : user,
        event_id: event instanceof UserEvent ? event?.id : event,
        send_id,
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

    // Update send state
    const records = await CampaignSend.update(
        qb => qb.where('user_id', userId)
            .where('campaign_id', campaignId),
        { state },
    )

    // If no records were updated then try and create missing record
    if (records <= 0) {
        await CampaignSend.query()
            .insert({
                user_id: userId,
                campaign_id: campaignId,
                state,
            })
            .onConflict(['user_id', 'list_id'])
            .merge(['state'])
    }
}

export const generateSendList = async (campaign: SentCampaign) => {

    const project = await getProject(campaign.project_id)
    if (!campaign.list_ids || !project) {
        throw new RequestError('Unable to send to a campaign that does not have an associated list', 404)
    }

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
                        ? crossTimezoneCopy(
                            campaign.send_at,
                            project.timezone,
                            timezone ?? project.timezone,
                        )
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

export const campaignSendReadyQuery = (campaignId: number) => {
    return CampaignSend.query()
        .where('campaign_sends.send_at', '<', CampaignSend.raw('NOW()'))
        .where('campaign_sends.state', 'pending')
        .where('campaign_id', campaignId)
        .select('user_id', 'campaign_sends.id AS send_id')
}

export const recipientQuery = (campaign: Campaign) => {
    return UserList.query()
        .select(UserList.raw('DISTINCT user_list.user_id'), 'users.timezone')

        // Join user subscriptions to filter out unsubscribes
        .leftJoin('user_subscription', qb => {
            qb.on('user_list.user_id', 'user_subscription.user_id')
                .andOn('user_subscription.subscription_id', '=', UserList.raw(campaign.subscription_id))
        })

        // Join in the exclusion list
        .leftJoin('user_list as ul2', qb => {
            qb.on('ul2.user_id', 'user_list.user_id')
                .onIn('ul2.list_id', campaign.exclusion_list_ids ?? [])
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
        .whereIn('user_list.list_id', campaign.list_ids ?? [])
        .whereNull('ul2.list_id')

        // Filter out existing sends (handle aborts & reschedules)
        .whereNull('campaign_sends.id')

        // Based on campaign type, filter out based on missing user
        // criteria
        .where(qb => {
            if (campaign.channel === 'email') {
                qb.whereNotNull('users.email')
            } else if (campaign.channel === 'text') {
                qb.whereNotNull('users.phone')
            } else if (campaign.channel === 'push') {
                qb.whereNotNull('users.devices')
            }
        })
}

export const abortCampaign = async (campaign: Campaign) => {
    await CampaignSend.query()
        .where('campaign_id', campaign.id)
        .where('state', 'pending')
        .update({ state: 'aborted' })
}

export const duplicateCampaign = async (campaign: Campaign) => {
    const params: Partial<Campaign> = pick(campaign, ['project_id', 'list_ids', 'exclusion_list_ids', 'provider_id', 'subscription_id', 'channel', 'name', 'type'])
    params.name = `Copy of ${params.name}`
    params.state = 'draft'
    const cloneId = await Campaign.insert(params)
    for (const template of campaign.templates) {
        await duplicateTemplate(template, cloneId)
    }
    return await getCampaign(cloneId, campaign.project_id)
}

const initialUsersCount = async (campaign: Campaign): Promise<number> => {
    const response = await recipientQuery(campaign)
        .clear('select')
        .select(UserList.raw('COUNT(DISTINCT(users.id)) as count'))
    const { count } = response[0]
    return Math.max(0, count)
}

export const campaignProgress = async (campaign: Campaign): Promise<CampaignProgress> => {
    const progress = await CampaignSend.query()
        .where('campaign_id', campaign.id)
        .select(CampaignSend.raw("SUM(IF(state = 'sent', 1, 0)) AS sent, SUM(IF(state IN('pending', 'throttled'), 1, 0)) AS pending, COUNT(*) AS total, SUM(IF(opened_at IS NOT NULL, 1, 0)) AS opens, SUM(IF(clicks > 0, 1, 0)) AS clicks"))
        .first()
    return {
        sent: parseInt(progress.sent ?? 0),
        pending: parseInt(progress.pending ?? 0),
        total: parseInt(progress.total ?? 0),
        opens: parseInt(progress.opens ?? 0),
        clicks: parseInt(progress.clicks ?? 0),
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

export const getCampaignSend = async (campaignId: number, userId: number) => {
    return CampaignSend.first(qb => qb.where('campaign_id', campaignId).where('user_id', userId))
}

export const updateCampaignSend = async (id: number, update: Partial<CampaignSend>) => {
    await CampaignSend.update(
        qb => qb.where('id', id),
        update,
    )
}

export const campaignPreview = async (project: Project, campaign: Campaign) => {
    const templates = await Template.all(
        qb => qb.where('campaign_id', campaign.id),
    )

    if (templates.length <= 0) return ''
    const template = templateInUserLocale(templates, project)
    const mapped = template.map()
    return screenshotHtml(mapped)
}
