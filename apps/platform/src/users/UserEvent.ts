import { UniversalModel } from '../core/Model'

export interface TemplateEvent extends Record<string, any> {
    name: string
}

export class UserEvent extends UniversalModel {
    uuid!: string
    project_id!: number
    user_id!: number
    name!: string
    data!: Record<string, unknown>
    created_at: Date = new Date()
    updated_at: Date = new Date()

    static jsonAttributes = ['data']

    flatten(): TemplateEvent {
        return {
            ...this.data,
            name: this.name,
            created_at: this.created_at,
        }
    }
}

export type UserEventParams = Pick<UserEvent, 'name' | 'data'>
