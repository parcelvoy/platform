import Model, { ModelParams } from '../core/Model'

export class RefreshToken extends Model {
    admin_id!: number
    token!: string
    revoked!: boolean
    expires_at!: Date
}

export type RefreshTokenParams = Omit<RefreshToken, ModelParams>
