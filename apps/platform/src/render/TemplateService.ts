import { SearchParams } from '../core/searchParams'
import Template, { TemplateParams, TemplateType, TemplateUpdateParams } from './Template'
import { pick, prune } from '../utilities'
import { Variables } from '.'
import { loadEmailChannel } from '../providers/email'
import { getCampaign } from '../campaigns/CampaignService'
import { User } from '../users/User'
import { UserEvent } from '../users/UserEvent'
import { loadTextChannel } from '../providers/text'
import { RequestError } from '../core/errors'
import CampaignError from '../campaigns/CampaignError'
import { loadPushChannel } from '../providers/push'
import { getUserFromEmail, getUserFromPhone } from '../users/UserRepository'
import { loadWebhookChannel } from '../providers/webhook'

export const pagedTemplates = async (params: SearchParams, projectId: number) => {
    return await Template.searchParams(
        params,
        [],
        b => b.where({ project_id: projectId }),
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
    return await Template.insertAndFetch({
        ...params,
        data: params.data ?? {},
        project_id: projectId,
    })
}

export const updateTemplate = async (templateId: number, params: TemplateUpdateParams) => {
    return await Template.updateAndFetch(templateId, prune(params))
}

export const deleteTemplate = async (id: number, projectId: number) => {
    return await Template.delete(qb => qb.where('id', id).where('project_id', projectId))
}

export const duplicateTemplate = async (template: Template, campaignId: number) => {
    const params: Partial<Template> = pick(template, ['project_id', 'locale', 'type', 'data'])
    params.campaign_id = campaignId
    return await Template.insert(params)
}

export const validateTemplates = async (projectId: number, campaignId: number) => {
    const templates = await allTemplates(projectId, campaignId)
    for (const template of templates) {
        const [isValid, error] = template.map().validate()
        if (!isValid) throw error
    }
}

export const sendProof = async (template: TemplateType, variables: Variables, recipient: string) => {

    const campaign = await getCampaign(template.campaign_id, template.project_id)
    if (!campaign) throw new RequestError(CampaignError.CampaignDoesNotExist)
    const event = UserEvent.fromJson(variables.event || {})
    const context = variables.context || {}
    const projectId = template.project_id

    if (template.type === 'email') {
        const channel = await loadEmailChannel(campaign.provider_id, projectId)
        await channel?.send(template, {
            user: User.fromJson({ ...variables.user, data: variables.user, email: recipient }),
            event,
            context,
        })
    } else if (template.type === 'text') {
        const channel = await loadTextChannel(campaign.provider_id, projectId)
        await channel?.send(template, {
            user: User.fromJson({ ...variables.user, data: variables.user, phone: recipient }),
            event,
            context,
        })
    } else if (template.type === 'push') {
        const channel = await loadPushChannel(campaign.provider_id, projectId)
        const user = await getUserFromEmail(projectId, recipient) ?? await getUserFromPhone(projectId, recipient)
        if (!user) throw new RequestError('Unable to find a user matching the criteria.')
        user.data = { ...variables.user, ...user.data }
        await channel?.send(template, {
            user,
            event,
            context,
        })
    } else if (template.type === 'webhook') {
        const channel = await loadWebhookChannel(campaign.provider_id, projectId)
        await channel?.send(template, {
            user: User.fromJson({ ...variables.user, data: variables.user }),
            event,
            context
        })
    } else {
        throw new RequestError('Sending template proofs is only supported for email and text message types as this time.')
    }
}
