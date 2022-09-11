import Project, { ProjectParams } from './Project'

export const createProject = async (params: ProjectParams): Promise<Project> => {
    return await Project.insertAndFetch(params)
}
