import { OrganizationRole } from '../organizations/Organization'
import Model, { ModelParams } from '../core/Model'

export default class Admin extends Model {
    organization_id!: number
    email!: string
    first_name?: string
    last_name?: string
    image_url?: string
    role!: OrganizationRole
}

export type AdminParams = Omit<Admin, ModelParams> & { domain?: string }

export type AuthAdminParams = Omit<AdminParams, 'organization_id' | 'role'> & { domain?: string }
