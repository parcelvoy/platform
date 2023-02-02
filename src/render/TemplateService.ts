import { Readable } from 'stream'
import { SearchParams } from '../core/searchParams'
import Template, { TemplateParams, TemplateType, TemplateUpdateParams } from './Template'
import nodeHtmlToImage from 'node-html-to-image'
import App from '../app'
import TemplateSnapshotJob from './TemplateSnapshotJob'
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
    const template = await Template.insertAndFetch({
        ...params,
        data: params.data ?? {},
        project_id: projectId,
    })

    App.main.queue.enqueue(
        TemplateSnapshotJob.from({ project_id: projectId, template_id: template.id }),
    )

    return template
}

export const updateTemplate = async (templateId: number, params: TemplateUpdateParams) => {
    const template = await Template.updateAndFetch(templateId, prune(params))

    App.main.queue.enqueue(
        TemplateSnapshotJob.from({ project_id: template.project_id, template_id: template.id }),
    )

    return template
}

export const renderTemplate = (template: TemplateType) => {
    if (template.type === 'email') {
        return template.html
    } else if (template.type === 'text') {
        return template.text
    } else if (template.type === 'push') {
        return `${template.title}<br/>${template.body}`
    }
    return ''
}

export const screenshotTemplate = async (template: TemplateType) => {
    const html = renderTemplate(template)
    const image = await nodeHtmlToImage({ html })
    const stream = Readable.from(image)
    await App.main.storage.upload({
        stream,
        url: screenshotPath(template.id),
    })
}

const screenshotPath = (templateId: number) => {
    return `templates/${templateId}_lg.jpg`
}

export const templateScreenshotUrl = (templateId: number) => {
    return App.main.storage.url(screenshotPath(templateId))
}

export const duplicateTemplate = async (template: Template, campaignId: number) => {
    const params: Partial<Template> = pick(template, ['project_id', 'locale', 'type', 'data'])
    params.campaign_id = campaignId
    return await Template.insert(params)
}
