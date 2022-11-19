import Model from '../core/Model'

export class RevokedAccessToken extends Model {
    expires_at!: Date
    token!: string
}
