import Model from '../core/Model'

export class AccessToken extends Model {
    admin_id!: number
    expires_at!: Date
    token!: string
    revoked!: boolean
    ip!: string
    user_agent!: string
}
