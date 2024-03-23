import { RequestError } from '../core/errors'
import Admin from '../auth/Admin'
import Provider from '../providers/Provider'
import { encodeHashid, uuid } from '../utilities'
import Organization, { OrganizationRole, organizationRoles } from './Organization'
import { JwtAdmin } from '../auth/AuthMiddleware'
import { Next, ParameterizedContext } from 'koa'

export const getOrganization = async (id: number) => {
    return await Organization.find(id)
}

export const getOrganizationByUsername = async (username: string) => {
    return await Organization.first(qb => qb.where('username', username))
}

export const getOrganizationByDomain = async (domain?: string) => {
    if (!domain) return undefined
    return await Organization.first(qb => qb.where('domain', domain))
}

export const getOrganizationByEmail = async (email: string) => {
    const admin = await Admin.first(qb => qb.where('email', email))
    if (!admin) return undefined
    return await getOrganization(admin.organization_id)
}

export const getDefaultOrganization = async () => {
    return await Organization.first()
}

export const createOrganization = async (domain?: string): Promise<Organization> => {
    let username = domain?.split('.').shift()
    let org: Organization | undefined
    try {
        org = await Organization.insertAndFetch({
            username,
        })
    } catch {
        username = undefined
        org = await Organization.insertAndFetch({
            username: uuid(),
        })
    }

    // If for some reason the domain format is odd, generate
    // a random username from the org id
    if (!username) {
        await Organization.updateAndFetch(org.id, {
            username: encodeHashid(org.id),
        })
    }
    return org
}

export const updateOrganization = async (organization: Organization, params: Partial<Organization>) => {
    return await Organization.updateAndFetch(organization.id, params)
}

export const organizationIntegrations = async (organization: Organization) => {
    return await Provider.all(
        qb => qb.leftJoin('projects', 'projects.id', 'providers.project_id')
            .where('projects.organization_id', organization.id),
    )
}

export const deleteOrganization = async (organization: Organization) => {
    await Organization.deleteById(organization.id)
}

export const requireOrganizationRole = (admin: Admin | JwtAdmin, minRole: OrganizationRole) => {
    if (organizationRoles.indexOf(admin.role) < organizationRoles.indexOf(minRole)) {
        throw new RequestError(`Minimum organization role ${minRole} is required`, 403)
    }
}

export const organizationRoleMiddleware = (minRole: OrganizationRole) => async (ctx: ParameterizedContext<{ admin?: Admin | JwtAdmin }>, next: Next) => {
    requireOrganizationRole(ctx.state.admin!, minRole)
    return next()
}
