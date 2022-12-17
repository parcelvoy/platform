import { Readable } from 'stream'
import { SearchParams } from '../core/searchParams'
import Template, { TemplateParams, TemplateType } from './Template'
import nodeHtmlToImage from 'node-html-to-image'
import App from '../app'
import TemplateSnapshotJob from './TemplateSnapshotJob'
import { prune } from '../utilities'

export const pagedTemplates = async (params: SearchParams, projectId: number) => {
    return await Template.searchParams(
        params,
        ['name'],
        b => b.where({ project_id: projectId }),
    )
}

export const allTemplates = async (projectId: number): Promise<Template[]> => {
    return await Template.all(qb => qb.where('project_id', projectId))
}

export const getTemplate = async (id: number, projectId: number) => {
    return await Template.find(id, qb => qb.where('project_id', projectId))
}

export const createTemplate = async (projectId: number, params: TemplateParams) => {
    const template = await Template.insertAndFetch({
        ...params,
        project_id: projectId,
    })

    App.main.queue.enqueue(
        TemplateSnapshotJob.from({ project_id: projectId, template_id: template.id }),
    )

    return template
}

export const updateTemplate = async (templateId: number, params: TemplateParams) => {
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
