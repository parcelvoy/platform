import { ProjectState } from '../auth/AuthMiddleware'
import { Next, ParameterizedContext } from 'koa'
import { RequestError } from '../core/errors'
import { PageParams } from '../core/searchParams'
import { createSubscription } from '../subscriptions/SubscriptionService'
import { uuid } from '../utilities'
import Project, { ProjectParams, ProjectRole, projectRoles } from './Project'
import { ProjectAdmin } from './ProjectAdmins'
import { ProjectApiKey, ProjectApiKeyParams } from './ProjectApiKey'
import { Admin } from '../auth/Admin'
import { getAdmin } from '../auth/AdminRepository'
import Locale, { LocaleParams } from './Locale'

export const adminProjectIds = async (adminId: number) => {
    const records = await ProjectAdmin.all(qb => qb.where('admin_id', adminId))
    return records.map(item => item.project_id)
}

export const pagedProjects = async (params: PageParams, adminId: number) => {
    const admin = await getAdmin(adminId)
    const projectIds = await adminProjectIds(adminId)
    return await Project.search({ ...params, fields: ['name'] }, qb =>
        qb.where(qb =>
            qb.where('organization_id', admin!.organization_id)
                .orWhereIn('projects.id', projectIds),
        ),
    )
}

export const allProjects = async (adminId: number) => {
    const admin = await getAdmin(adminId)
    const projectIds = await adminProjectIds(adminId)
    return await Project.all(qb =>
        qb.where(qb =>
            qb.where('organization_id', admin!.organization_id)
                .orWhereIn('projects.id', projectIds),
        ),
    )
}

export const getProject = async (id: number, adminId?: number) => {
    return Project.first(
        qb => {
            qb.where('projects.id', id)
                .select('projects.*')
            if (adminId != null) {
                qb.leftJoin('project_admins', 'project_admins.project_id', 'projects.id')
                    .where('admin_id', adminId)
                    .select('role')
            }
            return qb
        })
}

export const createProject = async (admin: Admin, params: ProjectParams): Promise<Project> => {
    const projectId = await Project.insert({
        ...params,
        organization_id: admin.organization_id,
    })

    // Add the user creating the project to it
    await ProjectAdmin.insert({
        project_id: projectId,
        admin_id: admin.id,
        role: 'admin',
    })

    // Create a single subscription for each type
    await createSubscription(projectId, { name: 'Default Email', channel: 'email' })
    await createSubscription(projectId, { name: 'Default SMS', channel: 'text' })
    await createSubscription(projectId, { name: 'Default Push', channel: 'push' })
    await createSubscription(projectId, { name: 'Default Webhook', channel: 'webhook' })

    const project = await getProject(projectId, admin.id)
    return project!
}

export const updateProject = async (id: number, adminId: number, params: Partial<ProjectParams>) => {
    await Project.update(qb => qb.where('id', id), params)
    return await getProject(id, adminId)
}

export const pagedApiKeys = async (params: PageParams, projectId: number) => {
    return await ProjectApiKey.search(
        { ...params, fields: ['name', 'description'] },
        qb => qb.where('project_id', projectId),
    )
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

export const updateProjectApiKey = async (id: number, params: ProjectApiKeyParams) => {
    return await ProjectApiKey.updateAndFetch(id, params)
}

export const revokeProjectApiKey = async (id: number) => {
    return await ProjectApiKey.updateAndFetch(id, { deleted_at: new Date() })
}

export const generateApiKey = (scope: 'public' | 'secret') => {
    const key = uuid().replace('-', '')
    const prefix = scope === 'public' ? 'pk' : 'sk'
    return `${prefix}_${key}`
}

export const requireProjectRole = (ctx: ParameterizedContext<ProjectState>, minRole: ProjectRole) => {
    if (projectRoles.indexOf(minRole) > projectRoles.indexOf(ctx.state.projectRole)) {
        throw new RequestError(`minimum project role ${minRole} is required`, 403)
    }
}

export const projectRoleMiddleware = (minRole: ProjectRole) => async (ctx: ParameterizedContext<ProjectState>, next: Next) => {
    requireProjectRole(ctx, minRole)
    return next()
}

export const pagedLocales = async (params: PageParams, projectId: number) => {
    return await Locale.search(
        { ...params, fields: ['name'] },
        qb => qb.where('project_id', projectId),
    )
}

export const createLocale = async (projectId: number, params: LocaleParams) => {
    return await Locale.insertAndFetch({
        ...params,
        project_id: projectId,
    })
}

export const deleteLocale = async (projectId: number, id: number) => {
    return await Locale.delete(qb => qb.where('project_id', projectId).where('id', id))
}
