import Model, { ModelParams } from '../core/Model'

export interface TemplateEvent extends Record<string, any> {
    name: string
}

export class UserEvent extends Model {
    project_id!: number
    user_id!: number
    name!: string
    data!: Record<string, unknown>

    static jsonAttributes = ['data']

    flatten(): TemplateEvent {
        return {
            ...this.data,
            name: this.name,
        }
    }
}

export type UserEventParams = Omit<UserEvent, ModelParams | 'flatten'>
