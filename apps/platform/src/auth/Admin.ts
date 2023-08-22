import Model, { ModelParams } from '../core/Model'

export default class Admin extends Model {
    organization_id!: number
    email!: string
    first_name?: string
    last_name?: string
    image_url?: string
}

export type AdminParams = Omit<Admin, ModelParams>
