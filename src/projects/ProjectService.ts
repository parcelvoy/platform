import Project, { ProjectParams } from './Project'
import ProjectAdmin from './ProjectAdmins'

export const createProject = async (params: ProjectParams): Promise<Project> => {
    return await Project.insertAndFetch(params)
}

export const adminProjectIds = async (adminId: number) => {
    const records = await ProjectAdmin.all(qb => qb.where('admin_id', adminId))
    return records.map(item => item.project_id)
}

export const getProject = async (id: number, adminId: number) => {
    console.log('admin', adminId)
    return Project.first(
        qb => qb.leftJoin('project_admins', 'project_admins.project_id', 'projects.id')
            .where('projects.id', id)
            .where('admin_id', adminId),
    )
}
