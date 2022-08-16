import Model from '../../models/Model'

export interface TemplateEvent extends Record<string, any> {
    name: string
}

export class UserEvent extends Model {
    user_id!: number
    name!: string
    properties!: Record<string, any>
    created_at!: Date
    updated_at!: Date

    flatten(): TemplateEvent {
        return {
            ...this.properties,
            name: this.name,
        }
    }
}
