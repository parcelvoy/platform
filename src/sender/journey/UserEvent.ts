import Model from '../../models/Model'

export class UserEvent extends Model {
    user_id!: number
    name!: string
    event_id!: string
    properties!: Record<string, any>
    created_at!: Date
    updated_at!: Date
}
