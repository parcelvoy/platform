import Template, { TemplateParams } from './Template'

export const allTemplates = async (projectId: number): Promise<Template[]> => {
    return await Template.all(qb => qb.where('project_id', projectId))
}

export const getTemplate = async (id: number, projectId: number) => {
    return await Template.find(id, qb => qb.where('project_id', projectId))
}

export const createTemplate = async (params: TemplateParams) => {
    return await Template.insertAndFetch(params)
}

export const updateTemplate = async (templateId: number, params: TemplateParams) => {
    return await Template.updateAndFetch(templateId, params)
}
