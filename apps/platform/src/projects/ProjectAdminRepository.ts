import { Admin } from '../auth/Admin'
import { Database } from '../config/database'
import { SearchParams } from '../core/searchParams'
import ProjectAdmin from './ProjectAdmins'

const baseProjectAdminQuery = (builder: Database.QueryBuilder<any>, projectId: number) => {
    return builder.where('project_id', projectId)
        .whereNull('project_admins.deleted_at')
        .rightJoin('project_admins', 'project_admins.admin_id', 'admins.id')
        .select('admins.*')
}

export const pagedProjectAdmins = async (params: SearchParams, projectId: number) => {
    return await Admin.searchParams(
        params,
        ['first_name', 'last_name'],
        qb => baseProjectAdminQuery(qb, projectId),
    )
}

export const allProjectAdmins = async (projectId: number) => {
    return await Admin.all(qb => baseProjectAdminQuery(qb, projectId))
}

export const getProjectAdmin = async (id: number, projectId: number) => {
    return await Admin.find(id, qb => baseProjectAdminQuery(qb, projectId))
}

export const addAdminToProject = async (projectId: number, adminId: number) => {
    const admin = await getProjectAdmin(adminId, projectId)
    if (admin) {
        return await updateAdminProjectState(projectId, adminId, false)
    }
    return await ProjectAdmin.insert({ admin_id: adminId, project_id: projectId })
}

export const updateAdminProjectState = async (projectId: number, adminId: number, isDeleted = true) => {
    return await ProjectAdmin.update(
        qb => qb.where('admin_id', adminId).where('project_id', projectId),
        { deleted_at: isDeleted ? new Date() : undefined },
    )
}
