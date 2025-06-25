import PushJob from '../providers/push/PushJob'
import WebhookJob from '../providers/webhook/WebhookJob'
import TextJob from '../providers/text/TextJob'
import EmailJob from '../providers/email/EmailJob'
import { logger } from '../config/logger'
import { User } from '../users/User'
import Campaign, { CampaignCreateParams, CampaignDelivery, CampaignParams, CampaignPopulationProgress, CampaignProgress, CampaignSend, CampaignSendParams, CampaignSendReferenceType, CampaignSendState, SentCampaign } from './Campaign'
import List from '../lists/List'
import Subscription, { SubscriptionState } from '../subscriptions/Subscription'
import { RequestError } from '../core/errors'
import { PageParams } from '../core/searchParams'
import { allLists } from '../lists/ListService'
import { allTemplates, duplicateTemplate, screenshotHtml, templateInUserLocale, validateTemplates } from '../render/TemplateService'
import { getSubscription, getUserSubscriptionState } from '../subscriptions/SubscriptionService'
import { chunk, Chunker, pick, shallowEqual } from '../utilities'
import { getProvider } from '../providers/ProviderRepository'
import { createTagSubquery, getTags, setTags } from '../tags/TagService'
import { getProject } from '../projects/ProjectService'
import CampaignError from './CampaignError'
import CampaignGenerateListJob from './CampaignGenerateListJob'
import Project from '../projects/Project'
import Template from '../render/Template'
import { differenceInDays, subDays } from 'date-fns'
import { cacheGet, cacheIncr } from '../config/redis'
import App from '../app'
import { releaseLock } from '../core/Lock'
import CampaignAbortJob from './CampaignAbortJob'
import { getRuleQuery } from '../rules/RuleEngine'
import { getJourneysForCampaign } from '../journey/JourneyService'

export const CacheKeys = {
    pendingStats: 'campaigns:pending_stats',
    populationProgress: (campaign: Campaign) => `campaigns:${campaign.id}:progress`,
    populationTotal: (campaign: Campaign) => `campaigns:${campaign.id}:total`,
}

export const pagedCampaigns = async (params: PageParams, projectId: number) => {
    const result = await Campaign.search(
        { ...params, fields: ['name'] },
        b => {
            b.where('project_id', projectId)
                .whereNull('deleted_at')
            if (params.filter?.type) {
                b.where('type', params.filter.type)
            }
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
    const campaign = await Campaign.find(id,
        qb => qb.where('project_id', projectId)
            .whereNull('deleted_at'),
    )

    if (campaign) {
        campaign.templates = await allTemplates(projectId, campaign.id)
        campaign.lists = campaign.list_ids ? await allLists(projectId, campaign.list_ids) : []
        campaign.exclusion_lists = campaign.exclusion_list_ids ? await allLists(projectId, campaign.exclusion_list_ids) : []
        campaign.subscription = await getSubscription(campaign.subscription_id, projectId)
        campaign.provider = await getProvider(campaign.provider_id, projectId)
        campaign.tags = await getTags(Campaign.tableName, [campaign.id]).then(m => m.get(campaign.id))
        if (campaign.type === 'trigger') campaign.journeys = await getJourneysForCampaign(projectId, campaign.id)
        if (campaign.state === 'loading') {
            campaign.progress = await campaignPopulationProgress(campaign)
        }
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
    let send_at: Date | undefined | null = data.send_at ? new Date(data.send_at) : undefined

    const isRescheduling = send_at != null
        && campaign.send_at != null
        && send_at !== campaign.send_at

    // If we are aborting, reset `send_at`
    if (data.state === 'aborted') {
        send_at = null
        data.state = 'aborting'
    }

    // If we are rescheduling, abort sends so they are reset
    if (isRescheduling) {
        data.state = 'aborting'
    }

    // Check templates to make sure we can schedule a send
    if (data.state === 'scheduled') {
        await validateTemplates(projectId, id)

        // Set to loading if success so scheduling starts
        data.state = 'loading'
    }

    // If this is a trigger campaign, should always be running
    if (data.type === 'trigger') {
        data.state = 'running'
    }

    await Campaign.update(qb => qb.where('id', id), {
        ...data,
        send_at,
    })

    if (tags) {
        await setTags({
            project_id: projectId,
            entity: Campaign.tableName,
            entity_id: id,
            names: tags,
        })
    }

    if (data.state === 'loading' && campaign.type === 'blast') {
        await CampaignGenerateListJob.from(campaign).queue()
    }

    if (data.state === 'aborting') {
        await CampaignAbortJob.from({ ...campaign, reschedule: isRescheduling }).queue()
    }

    return await getCampaign(id, projectId)
}

export const archiveCampaign = async (id: number, projectId: number) => {
    await Campaign.archive(id, qb => qb.where('project_id', projectId))
    return getCampaign(id, projectId)
}

export const deleteCampaign = async (id: number, projectId: number) => {
    return await Campaign.deleteById(id, qb => qb.where('project_id', projectId))
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
    exists?: boolean
    reference_type?: CampaignSendReferenceType
    reference_id?: string
}

export const triggerCampaignSend = async ({ campaign, user, exists, reference_type, reference_id }: SendCampaign) => {
    const userId = user instanceof User ? user.id : user

    const subscriptionState = await getUserSubscriptionState(userId, campaign.subscription_id)
    if (subscriptionState === SubscriptionState.unsubscribed) return

    const reference = { reference_id, reference_type }
    if (!exists) {
        await CampaignSend.insert({
            campaign_id: campaign.id,
            user_id: userId,
            state: 'pending',
            send_at: new Date(),
            ...reference,
        })
    }

    return sendCampaignJob({
        campaign,
        user: userId,
        ...reference,
    })
}

export const sendCampaignJob = ({ campaign, user, reference_type, reference_id }: SendCampaign): EmailJob | TextJob | PushJob | WebhookJob => {

    const body = {
        campaign_id: campaign.id,
        user_id: user instanceof User ? user.id : user,
        reference_type,
        reference_id,
    }

    const channels = {
        email: EmailJob.from(body),
        text: TextJob.from(body),
        push: PushJob.from(body),
        webhook: WebhookJob.from(body),
    }
    const job = channels[campaign.channel]
    job.jobId(`sid_${campaign.id}_${body.user_id}_${body.reference_id}`)

    return job
}

interface UpdateSendStateParams {
    campaign: Campaign | number
    user: User | number
    state?: CampaignSendState
    reference_id?: string
    response?: any
}

export const updateSendState = async ({ campaign, user, state = 'sent', reference_id = '0' }: UpdateSendStateParams) => {
    const userId = user instanceof User ? user.id : user
    const campaignId = campaign instanceof Campaign ? campaign.id : campaign

    // Update send state
    const records = await CampaignSend.update(
        qb => qb.where('user_id', userId)
            .where('campaign_id', campaignId)
            .where('reference_id', reference_id),
        { state },
    )

    // If no records were updated then try and create missing record
    if (records <= 0) {
        const records = await CampaignSend.query()
            .insert({
                user_id: userId,
                campaign_id: campaignId,
                reference_id,
                state,
            })
            .onConflict(['campaign_id', 'user_id', 'reference_id'])
            .merge(['state'])
        return Array.isArray(records) ? records[0] : records
    }

    return records
}

export const generateSendList = async (campaign: SentCampaign) => {

    const project = await getProject(campaign.project_id)
    if (!campaign.list_ids || !project) {
        throw new RequestError('Unable to send to a campaign that does not have an associated list', 404)
    }

    const now = Date.now()
    const cacheKey = CacheKeys.populationProgress(campaign)

    const query = await recipientClickhouseQuery(campaign)

    logger.info({
        campaignId: campaign.id,
        elapsed: Date.now() - now,
        query,
    }, 'campaign:generate:progress:started')

    // Generate the initial send list
    const result = await User.clickhouse().query(query)

    const chunker = new Chunker<CampaignSendParams>(async items => {
        await App.main.db.transaction(async (trx) => {
            await CampaignSend.query(trx)
                .insert(items)
                .onConflict(['campaign_id', 'user_id', 'reference_id'])
                .merge(['state', 'send_at'])
        })
        await cacheIncr(App.main.redis, cacheKey, items.length, 300)
    }, 500)

    for await (const chunk of result.stream() as any) {
        for (const result of chunk) {
            const user = result.json()
            await chunker.add(CampaignSend.create(campaign, project, user))
        }
    }

    await chunker.flush()

    logger.info({ campaignId: campaign.id, elapsed: Date.now() - now }, 'campaign:generate:progress:finished')

    await Campaign.update(qb => qb.where('id', campaign.id), { state: 'scheduled' })
}

export const campaignSendReadyQuery = (
    campaignId: number,
    includeThrottled = false,
    limit?: number,
) => {
    const query = CampaignSend.query()
        .where('campaign_sends.send_at', '<=', CampaignSend.raw('NOW()'))
        .whereIn('campaign_sends.state', includeThrottled ? ['pending', 'throttled'] : ['pending'])
        .where('campaign_id', campaignId)
        .select('user_id', 'reference_id')
    if (limit) query.limit(limit)
    return query
}

export const failStalledSends = async (campaign: Campaign) => {

    const stalledDays = 2

    // Its not possible to have any stalled records if the campaign send
    // was less than the number of days we are checking for
    if (
        campaign.send_at
        && differenceInDays(
            Date.now(),
            new Date(campaign.send_at),
        ) >= stalledDays
    ) return

    const query = CampaignSend.query()
        .where('campaign_sends.send_at', '<', subDays(Date.now(), stalledDays))
        .where('campaign_sends.state', 'throttled')
        .where('campaign_id', campaign.id)
        .select('user_id', 'campaign_id')
    await chunk(query, 25, async (items) => {
        await CampaignSend.query()
            .update({ state: 'failed' })
            .whereIn(['user_id', 'campaign_id'], items)
    }, ({ user_id, campaign_id }: CampaignSend) => ([user_id, campaign_id]))
}

const recipientClickhouseQuery = async (campaign: Campaign) => {

    const listQueries = async (ids: number[]) => {
        const queries = []
        const lists = await List.query()
            .select('rule')
            .whereIn('id', ids)
        for (const list of lists) {
            queries.push('(' + getRuleQuery(campaign.project_id, list.rule) + ')')
        }
        return queries.join(' union distinct ')
    }

    const channelClause = () => {
        if (campaign.channel === 'email') {
            return "(users.email != '' AND users.email IS NOT NULL)"
        } else if (campaign.channel === 'text') {
            return "(users.phone != '' AND users.phone IS NOT NULL)"
        } else if (campaign.channel === 'push') {
            return '(users.devices IS NOT NULL AND NOT empty(users.devices))'
        }
        return ''
    }

    const parts = [
        channelClause(),
        `NOT has(unsubscribe_ids, ${campaign.subscription_id})`,
    ]
    if (campaign.exclusion_list_ids?.length) {
        parts.push(`id NOT IN (${await listQueries(campaign.exclusion_list_ids)})`)
    }
    if (campaign.list_ids?.length) {
        parts.push(`id IN (${await listQueries(campaign.list_ids)})`)
    }
    return `
        SELECT distinct id, argMax(timezone, version) AS timezone
        FROM users
        WHERE ${parts.join(' AND ')}
        GROUP BY id
    `
}

export const abortCampaign = async (campaign: Campaign) => {
    await CampaignSend.query()
        .where('campaign_id', campaign.id)
        .where('state', 'pending')
        .update({ state: 'aborted' })
    await releaseLock(`campaign_generate_${campaign.id}`)
}

export const clearCampaign = async (campaign: Campaign) => {
    await CampaignSend.query()
        .where('campaign_id', campaign.id)
        .whereIn('state', ['pending', 'throttled', 'aborted'])
        .delete()
}

export const duplicateCampaign = async (campaign: Campaign) => {
    const params: Partial<Campaign> = pick(campaign, ['project_id', 'list_ids', 'exclusion_list_ids', 'provider_id', 'subscription_id', 'channel', 'name', 'type'])
    params.name = `Copy of ${params.name}`
    params.state = campaign.type === 'blast' ? 'draft' : 'running'
    const cloneId = await Campaign.insert(params)
    for (const template of campaign.templates) {
        await duplicateTemplate(template, cloneId)
    }
    return await getCampaign(cloneId, campaign.project_id)
}

export const campaignPopulationProgress = async (campaign: Campaign): Promise<CampaignPopulationProgress> => {
    return {
        complete: await cacheGet<number>(App.main.redis, CacheKeys.populationProgress(campaign)) ?? 0,
        total: await cacheGet<number>(App.main.redis, CacheKeys.populationTotal(campaign)) ?? 0,
    }
}

export const campaignDeliveryProgress = async (campaignId: number): Promise<CampaignProgress> => {
    const progress = await CampaignSend.query()
        .where('campaign_id', campaignId)
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

export const updateCampaignProgress = async (campaign: Campaign): Promise<void> => {
    const currentState = (pending: number, delivery: CampaignDelivery) => {
        if (campaign.type === 'trigger') return 'running'
        if (campaign.state === 'loading') return 'loading'
        if (pending <= 0) return 'finished'
        if (delivery.sent === 0) return 'scheduled'
        return 'running'
    }

    const { pending, ...delivery } = await campaignDeliveryProgress(campaign.id)
    const state = currentState(pending, delivery)

    // If nothing has changed, continue otherwise update
    if (shallowEqual(campaign.delivery, delivery) && state === campaign.state) return
    await Campaign.update(qb => qb.where('id', campaign.id).where('project_id', campaign.project_id), { state, delivery })
}

export const getCampaignSend = async (campaignId: number, userId: number, referenceId = '0') => {
    return CampaignSend.first(qb => qb
        .where('campaign_id', campaignId)
        .where('user_id', userId)
        .where('reference_id', referenceId),
    )
}

export const updateCampaignSend = async (campaignId: number, userId: number, referenceId: string, update: Partial<CampaignSend>) => {
    await CampaignSend.update(
        qb => qb
            .where('campaign_id', campaignId)
            .where('user_id', userId)
            .where('reference_id', referenceId),
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

export const estimatedSendSize = async (campaign: Campaign) => {
    const lists: List[] = await List.query().whereIn('id', campaign.list_ids ?? [])
    return lists.reduce((acc, list) => (list.users_count ?? 0) + acc, 0)
}

export const canSendCampaignToUser = async (campaign: Campaign, user: Pick<User, 'email' | 'phone' | 'devices'>) => {
    if (campaign.channel === 'email' && !user.email) return false
    if (campaign.channel === 'text' && !user.phone) return false
    if (campaign.channel === 'push' && !user.devices) return false
    return true
}
