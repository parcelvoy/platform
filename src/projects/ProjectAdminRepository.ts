import { Admin } from '../auth/Admin'
import { Database } from '../config/database'
import { SearchParams } from '../core/searchParams'

const baseProjectAdminQuery = (builder: Database.QueryBuilder<any>, projectId: number) => {
    return builder.where('project_id', projectId)
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

export const getList = async (id: number, projectId: number) => {
    return await Admin.find(id, qb => baseProjectAdminQuery(qb, projectId))
}
