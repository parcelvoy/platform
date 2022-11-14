import { uuid } from '../utilities'
import Project, { ProjectParams } from './Project'
import ProjectAdmin from './ProjectAdmins'
import { ProjectApiKey, ProjectApiKeyParams } from './ProjectApiKey'

export const createProject = async (params: ProjectParams): Promise<Project> => {
    return await Project.insertAndFetch(params)
}

export const adminProjectIds = async (adminId: number) => {
    const records = await ProjectAdmin.all(qb => qb.where('admin_id', adminId))
    return records.map(item => item.project_id)
}

export const getProject = async (id: number, adminId?: number) => {
    return Project.first(
        qb => {
            qb.where('projects.id', id)
            if (adminId != null) {
                qb.leftJoin('project_admins', 'project_admins.project_id', 'projects.id')
                    .where('admin_id', adminId)
            }
            return qb
        })
}

export const getProjectApiKey = async (key: string) => {
    return ProjectApiKey.first(qb => qb.where('value', key).whereNull('deleted_at'))
}

export const createProjectApiKey = async (projectId: number, params: ProjectApiKeyParams) => {
    return await ProjectApiKey.insertAndFetch({
        ...params,
        value: generateApiKey(params.scope),
        project_id: projectId,
    })
}

export const revokeProjectApiKey = async (id: number) => {
    return await ProjectApiKey.updateAndFetch(id, { deleted_at: new Date() })
}

export const generateApiKey = (scope: 'public' | 'secret') => {
    const key = uuid().replace('-', '')
    const prefix = scope === 'public' ? 'pk' : 'sk'
    return `${prefix}_${key}`
}
