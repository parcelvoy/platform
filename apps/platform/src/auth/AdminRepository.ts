import { SearchParams } from '../core/searchParams'
import Organization from '../organizations/Organization'
import Project from '../projects/Project'
import { Admin, AdminParams } from './Admin'

export const pagedAdmins = async (params: SearchParams) => {
    return await Admin.searchParams(
        params,
        ['first_name', 'last_name', 'email'],
    )
}

export const getAdmin = async (id: number): Promise<Admin | undefined> => {
    return await Admin.find(id)
}

export const getAdminByEmail = async (email: string): Promise<Admin | undefined> => {
    return await Admin.first(qb => qb.where('email', email))
}

export const createOrUpdateAdmin = async (params: AdminParams): Promise<Admin> => {
    const admin = await getAdminByEmail(params.email)

    // TODO: Move organization ID to be dynamic.
    // During migration to supporting organizations only a single
    // org will be allowed.
    let org = await Organization.find(1)
    if (!org) org = await initOrganization(admin)

    if (admin?.id) {
        return Admin.updateAndFetch(admin.id, params)
    } else {
        return Admin.insertAndFetch({
            ...params,
            organization_id: org.id,
        })
    }
}

const initOrganization = async (admin?: Admin): Promise<Organization> => {
    const domain = admin?.email.split('@').pop()
    const username = domain
        ? new URL(domain).hostname.split('.').pop()
        : 'Organization'
    const org = await Organization.insertAndFetch({
        id: 1,
        username,
        domain,
    })
    await Project.update(qb => qb, { organization_id: org.id })
    await Admin.update(qb => qb, { organization_id: org.id })

    return org
}
