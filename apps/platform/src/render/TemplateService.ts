import { PageParams } from '../core/searchParams'
import Template, { EmailTemplate, PushTemplate, TemplateParams, TemplateType, TemplateUpdateParams, TextTemplate, WebhookTemplate } from './Template'
import { partialMatchLocale, pick, prune } from '../utilities'
import { Variables } from '.'
import { loadEmailChannel } from '../providers/email'
import { getCampaign } from '../campaigns/CampaignService'
import { User } from '../users/User'
import { UserEvent } from '../users/UserEvent'
import { loadTextChannel } from '../providers/text'
import { RequestError } from '../core/errors'
import CampaignError from '../campaigns/CampaignError'
import { loadPushChannel } from '../providers/push'
import { disableNotifications, getUserFromEmail, getUserFromPhone } from '../users/UserRepository'
import { loadWebhookChannel } from '../providers/webhook'
import Project from '../projects/Project'
import { getProject } from '../projects/ProjectService'
import { logger } from '../config/logger'
import EventPostJob from '../client/EventPostJob'
import { getPushDevicesForUser } from '../users/DeviceRepository'
import Campaign from '../campaigns/Campaign'

export const pagedTemplates = async (params: PageParams, projectId: number) => {
    return await Template.search(
        params,
        qb => qb.where('project_id', projectId),
    )
}

export const allTemplates = async (projectId: number, campaignId?: number): Promise<Template[]> => {
    return await Template.all(qb => {
        if (campaignId) {
            qb.where('campaign_id', campaignId)
        }
        return qb.where('project_id', projectId)
    })
}

export const getTemplate = async (id: number, projectId: number) => {
    return await Template.find(id, qb => qb.where('project_id', projectId))
}

export const createTemplate = async (projectId: number, params: TemplateParams) => {
    const hasLocale = await Template.exists(
        qb => qb.where('locale', params.locale)
            .where('project_id', projectId)
            .where('campaign_id', params.campaign_id),
    )
    if (hasLocale) throw new RequestError('A template with this locale already exists.')

    const template = await Template.insertAndFetch({
        ...params,
        data: params.data ?? {},
        project_id: projectId,
    })
    return template
}

export const updateTemplate = async (templateId: number, params: TemplateUpdateParams) => {
    const template = await Template.updateAndFetch(templateId, prune(params))
    return template
}

export const deleteTemplate = async (id: number, projectId: number) => {
    return await Template.deleteById(id, qb => qb.where('project_id', projectId))
}

export const duplicateTemplate = async (template: Template, campaignId: number) => {
    const params: Partial<Template> = pick(template, ['project_id', 'locale', 'type', 'data'])
    params.campaign_id = campaignId
    return await Template.insert(params)
}

export const screenshotHtml = (template: TemplateType) => {
    if (template.type === 'email') {
        return template.html
    } else if (template.type === 'text') {
        return template.text
    } else if (template.type === 'push') {
        return `<html style="font-size:36px;padding:10px">${template.title}<br/>${template.body}</html>`
    }
    return ''
}

export const validateTemplates = async (projectId: number, campaignId: number) => {
    const templates = await allTemplates(projectId, campaignId)
    for (const template of templates) {
        const [isValid, error] = template.map().validate()
        if (!isValid) throw error
    }
}

export const sendProof = async (template: TemplateType, variables: Variables, recipient: string) => {

    // Ensure proof is ready to send
    const [isValid, error] = template.validate()
    if (!isValid) throw error

    const campaign = await getCampaign(template.campaign_id, template.project_id)
    const project = await getProject(template.project_id)
    if (!campaign || !project) throw new RequestError(CampaignError.CampaignDoesNotExist)
    const event = UserEvent.fromJson(variables.event || {})
    const context = {
        ...variables.context,
        campaign_id: template.campaign_id,
    }

    const user = (await getUserFromEmail(project.id, recipient))
        ?? (await getUserFromPhone(project.id, recipient))
        ?? User.fromJson({ ...variables.user, email: recipient, phone: recipient })
    user.data = { ...user?.data, ...variables.user }
    variables = { user, event, context, project }

    let response: any
    if (template.type === 'email') {
        response = await sendEmailProof(campaign, template, variables)
    } else if (template.type === 'text') {
        response = await sendTextProof(campaign, template, variables)
    } else if (template.type === 'push') {
        response = await sendPushProof(campaign, template, variables)
    } else if (template.type === 'webhook') {
        response = await sendWebhookProof(campaign, template, variables)
    } else {
        throw new RequestError('Sending template proofs is only supported for email and text message types as this time.')
    }

    await EventPostJob.from({
        project_id: project.id,
        user_id: user.id,
        event: {
            name: 'proof_sent',
            external_id: user.external_id,
            data: {
                context,
                response,
            },
        },
    }).queue()

    return response
}

const sendEmailProof = async (campaign: Campaign, template: EmailTemplate, variables: Variables) => {
    if (variables.user.unsubscribe_ids?.includes(campaign.subscription_id)) {
        throw new RequestError('This template cannot be sent to this user as they have unsubscribed from emails.')
    }
    const channel = await loadEmailChannel(campaign.provider_id, variables.project.id)
    const response = await channel?.send(template, variables)
    logger.info(response, 'template:proof:email:result')
    return response
}

const sendTextProof = async (campaign: Campaign, template: TextTemplate, variables: Variables) => {
    const channel = await loadTextChannel(campaign.provider_id, variables.project.id)
    const response = await channel?.send(template, variables)
    logger.info(response, 'template:proof:text:result')
    return response
}

const sendPushProof = async (campaign: Campaign, template: PushTemplate, variables: Variables) => {
    const { user, project } = variables
    const devices = await getPushDevicesForUser(project.id, user.id)
    const channel = await loadPushChannel(campaign.provider_id, project.id)
    if (!user.id) throw new RequestError('Unable to find a user matching the criteria.')
    const response = await channel?.send(template, devices, variables)

    // Disable any tokens that we've discovered are invalid
    if (response?.invalidTokens.length) {
        await disableNotifications(user, response.invalidTokens)
    }
    logger.info(response, 'template:proof:push:result')
    return response
}

const sendWebhookProof = async (campaign: Campaign, template: WebhookTemplate, variables: Variables) => {
    const channel = await loadWebhookChannel(campaign.provider_id, variables.project.id)
    return await channel?.send(template, variables)
}

// Determine what template to send to the user based on the following:
// - Find an exact match of users locale with a template
// - Find a partial match (same root locale i.e. `en` vs `en-US`)
// - If a project locale is set and there is match, use that template
// - If there is a project locale and its a partial match, use
// - Otherwise return any template available
export const templateInUserLocale = (templates: Template[], project?: Project, user?: User) => {
    return templates.find(item => item.locale === user?.locale)
        || templates.find(item => partialMatchLocale(item.locale, user?.locale))
        || templates.find(item => item.locale === project?.locale)
        || templates.find(item => partialMatchLocale(item.locale, project?.locale))
        || templates[0]
}
