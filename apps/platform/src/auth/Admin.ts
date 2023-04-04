import Model, { ModelParams } from '../core/Model'

export class Admin extends Model {
    email!: string
    first_name?: string
    last_name?: string
    image_url?: string
}

export type AdminParams = Omit<Admin, ModelParams>
