import PushJob from '../providers/push/PushJob'
import WebhookJob from '../providers/webhook/WebhookJob'
import TextJob from '../providers/text/TextJob'
import EmailJob from '../providers/email/EmailJob'
import { User } from '../users/User'
import { UserEvent } from '../users/UserEvent'
import Campaign, { CampaignCreateParams, CampaignDelivery, CampaignParams, CampaignProgress, CampaignSend, CampaignSendParams, CampaignSendReferenceType, CampaignSendState, SentCampaign } from './Campaign'
import List, { UserList } from '../lists/List'
import Subscription, { SubscriptionState, UserSubscription } from '../subscriptions/Subscription'
import { RequestError } from '../core/errors'
import { PageParams } from '../core/searchParams'
import { allLists } from '../lists/ListService'
import { allTemplates, duplicateTemplate, screenshotHtml, templateInUserLocale, validateTemplates } from '../render/TemplateService'
import { getSubscription, getUserSubscriptionState } from '../subscriptions/SubscriptionService'
import { chunk, pick, shallowEqual } from '../utilities'
import { getProvider } from '../providers/ProviderRepository'
import { createTagSubquery, getTags, setTags } from '../tags/TagService'
import { getProject } from '../projects/ProjectService'
import CampaignError from './CampaignError'
import CampaignGenerateListJob from './CampaignGenerateListJob'
import Project from '../projects/Project'
import Template from '../render/Template'
import { subDays } from 'date-fns'
import { raw } from '../core/Model'

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
    let send_at: Date | undefined | null = data.send_at ? new Date(data.send_at) : undefined

    // If we are aborting, reset `send_at`
    if (data.state === 'aborted') {
        send_at = null
        await abortCampaign(campaign)
    }

    // If we are rescheduling, abort sends so they are reset
    if (send_at
        && campaign.send_at
        && send_at !== campaign.send_at) {
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

    if (data.state === 'pending' && campaign.type === 'blast') {
        await CampaignGenerateListJob.from(campaign).queue()
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

export const triggerCampaignSend = async ({ campaign, user, event, send_id, reference_type, reference_id }: SendCampaign) => {
    const userId = user instanceof User ? user.id : user
    const eventId = event instanceof UserEvent ? event?.id : event

    const subscriptionState = await getUserSubscriptionState(userId, campaign.subscription_id)
    if (subscriptionState === SubscriptionState.unsubscribed) return

    const reference = { reference_id, reference_type }
    if (!send_id) {
        send_id = await CampaignSend.insert({
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
        event: eventId,
        send_id,
        ...reference,
    })
}

interface SendCampaign {
    campaign: Campaign
    user: User | number
    event?: UserEvent | number
    send_id?: number
    reference_type?: CampaignSendReferenceType
    reference_id?: string
}

export const sendCampaignJob = ({ campaign, user, event, send_id, reference_type, reference_id }: SendCampaign): EmailJob | TextJob | PushJob | WebhookJob => {

    // TODO: Might also need to check for unsubscribe in here since we can
    // do individual sends
    const body = {
        campaign_id: campaign.id,
        user_id: user instanceof User ? user.id : user,
        event_id: event instanceof UserEvent ? event?.id : event,
        send_id,
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
    if (send_id) {
        job.jobId(`sid${send_id}`)
    }

    return job
}

export const sendCampaign = async (data: SendCampaign): Promise<void> => {
    await sendCampaignJob(data).queue()
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

    const query = recipientQuery(campaign)
    await chunk<CampaignSendParams>(query, 100, async (items) => {
        await CampaignSend.query()
            .insert(items)
            .onConflict(['campaign_id', 'user_id', 'reference_id'])
            .merge(['state', 'send_at'])
    }, ({ user_id, timezone }: { user_id: number, timezone: string }) =>
        CampaignSend.create(campaign, project, User.fromJson({ id: user_id, timezone })),
    )

    await Campaign.update(qb => qb.where('id', campaign.id), { state: 'scheduled' })
}

export const campaignSendReadyQuery = (campaignId: number) => {
    return CampaignSend.query()
        .where('campaign_sends.send_at', '<=', CampaignSend.raw('NOW()'))
        .where('campaign_sends.state', 'pending')
        .where('campaign_id', campaignId)
        .select('user_id', 'campaign_sends.id AS send_id')
}

export const checkStalledSends = (campaignId: number) => {
    return CampaignSend.query()
        .where('campaign_sends.send_at', '<', subDays(Date.now(), 2))
        .where('campaign_sends.state', 'throttled')
        .where('campaign_id', campaignId)
        .update({ state: 'failed' })
}

export const recipientQuery = (campaign: Campaign) => {

    // Only include users who are in matching lists
    const inListQuery = UserList.query()
        .select('user_id')
        .whereIn('list_id', campaign.list_ids ?? [])

    // Filter out anyone in the exlusion list
    const notInListQuery = UserList.query()
        .select('user_id')
        .whereIn('list_id', campaign.exclusion_list_ids ?? [])

    // Filter out anyone who has already been sent to (but allow for
    // regenerating for aborts & reschedules)
    const hasSendQuery = CampaignSend.query()
        .select('user_id')
        .where('campaign_id', campaign.id)
        .where('state', 'sent')

    // Filter out anyone who has unsubscribed
    const unsubscribesQuery = UserSubscription.query()
        .select('user_id')
        .where('subscription_id', campaign.subscription_id)
        .where('state', SubscriptionState.unsubscribed)

    return User.query()
        .select('users.id AS user_id', 'users.timezone')
        .whereIn('users.id', inListQuery)
        .whereNotIn('users.id', notInListQuery)
        .whereNotIn('users.id', hasSendQuery)
        .whereNotIn('users.id', unsubscribesQuery)
        .where('users.project_id', campaign.project_id)

        // Reduce to only users with appropriate send parameters
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
    params.state = campaign.type === 'blast' ? 'draft' : 'running'
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

export const campaignProgress = async (campaignId: number): Promise<CampaignProgress> => {
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
        if (pending <= 0) return 'finished'
        if (delivery.sent === 0) return 'scheduled'
        return 'running'
    }

    const { pending, ...delivery } = await campaignProgress(campaign.id)
    const state = currentState(pending, delivery)

    // If nothing has changed, continue otherwise update
    if (shallowEqual(campaign.delivery, delivery) && state === campaign.state) return
    await Campaign.update(qb => qb.where('id', campaign.id).where('project_id', campaign.project_id), { state, delivery })
}

export const getCampaignSend = async (campaignId: number, userId: number, referenceId: string) => {
    return CampaignSend.first(qb => qb
        .where('campaign_id', campaignId)
        .where('user_id', userId)
        .where('reference_id', referenceId),
    )
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

export const updateCampaignSendEnrollment = async (user: User) => {
    const campaigns = await Campaign.query()
        .leftJoin('campaign_sends', (qb) =>
            qb.on('campaign_sends.campaign_id', 'campaigns.id')
                .andOn('campaign_sends.user_id', raw(user.id)),
        )
        .leftJoin('projects', 'projects.id', 'campaigns.project_id')
        .where('campaigns.project_id', user.project_id)
        .where('campaigns.state', 'scheduled')
        .select('campaigns.*', 'campaign_sends.id AS send_id', 'campaign_sends.state AS send_state', 'projects.timezone') as Array<SentCampaign & { send_id: number, send_state: CampaignSendState, timezone: string }>

    const join = []
    const leave = []
    for (const campaign of campaigns) {
        const match = await recipientQuery(campaign)
            .where('users.id', user.id)
            .first()

        // If user matches recipient query and they aren't already in the
        // list, add to send list
        if (match && !campaign.send_id) {
            join.push(CampaignSend.create(campaign, Project.fromJson({ timezone: campaign.timezone }), user))
        }

        // If user is not in recipient list but we have a record, remove from
        // send list
        if (!match && campaign.send_id && campaign.send_state === 'pending') {
            leave.push(campaign.send_id)
        }
    }

    if (leave.length) {
        await CampaignSend.query().whereIn('id', leave).delete()
    }
    if (join.length) {
        await CampaignSend.query()
            .insert(join)
            .onConflict(['campaign_id', 'user_id', 'reference_id'])
            .merge(['state', 'send_at'])
    }
}
