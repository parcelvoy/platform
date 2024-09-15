import Resource, { ResourceParams, ResourceType } from './Resource'

export const allResources = async (projectId: number, type?: ResourceType): Promise<Resource[]> => {
    return await Resource.all(qb => {
        if (type) {
            qb.where('type', type)
        }
        return qb.where('project_id', projectId)
    })
}

export const getResource = async (id: number, projectId: number) => {
    return await Resource.find(id, qb => qb.where('project_id', projectId))
}

export const createResource = async (projectId: number, params: ResourceParams) => {
    return await Resource.insertAndFetch({
        ...params,
        project_id: projectId,
    })
}

export const deleteResource = async (id: number, projectId: number) => {
    return await Resource.deleteById(id, qb => qb.where('project_id', projectId))
}
