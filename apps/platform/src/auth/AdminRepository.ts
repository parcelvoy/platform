import { PageParams } from '../core/searchParams'
import Admin, { AdminParams } from './Admin'

export const pagedAdmins = async (organizationId: number, params: PageParams) => {
    return await Admin.search(
        { ...params, fields: ['first_name', 'last_name', 'email'] },
        qb => qb.where('organization_id', organizationId),
    )
}

export const getAdmin = async (id: number, organizationId: number): Promise<Admin | undefined> => {
    return await Admin.find(id, qb => qb.where('organization_id', organizationId))
}

export const getAdminByEmail = async (email: string): Promise<Admin | undefined> => {
    return await Admin.first(qb => qb.where('email', email))
}

export const createOrUpdateAdmin = async ({ organization_id, ...params }: AdminParams): Promise<Admin> => {
    const admin = await getAdminByEmail(params.email)

    if (admin?.id) {
        return Admin.updateAndFetch(admin.id, params)
    } else {
        return Admin.insertAndFetch({
            ...params,
            organization_id,
        })
    }
}
