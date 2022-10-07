import { Template, TemplateParams } from './Template'

export const createTemplate = async (params: TemplateParams) => {
    return await Template.insertAndFetch(params)
}
