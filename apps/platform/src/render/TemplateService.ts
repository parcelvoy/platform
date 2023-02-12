import { SearchParams } from '../core/searchParams'
import Template, { TemplateParams, TemplateUpdateParams } from './Template'
import { pick, prune } from '../utilities'

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

export const duplicateTemplate = async (template: Template, campaignId: number) => {
    const params: Partial<Template> = pick(template, ['project_id', 'locale', 'type', 'data'])
    params.campaign_id = campaignId
    return await Template.insert(params)
}
