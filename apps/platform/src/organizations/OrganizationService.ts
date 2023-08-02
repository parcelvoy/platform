import { Admin } from '../auth/Admin'
import { encodeHashid } from '../utilities'
import Organization from './Organization'

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

export const createOrganization = async (domain: string): Promise<Organization> => {
    const username = domain.split('.').shift()
    const org = await Organization.insertAndFetch({
        username,
        domain,
    })

    // If for some reason the domain format is odd, generate
    // a random username from the org id
    if (!username) {
        await Organization.updateAndFetch(org.id, {
            username: encodeHashid(org.id),
        })
    }
    return org
}
