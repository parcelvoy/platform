import { ClientIdentity } from '../client/Client'
import Model, { ModelParams } from '../core/Model'

export interface TemplateUser extends Record<string, any> {
    id: string
    email?: string
    phone?: string
}

export interface UserAttribute {
    id: number
    user_id: number
    key: string
    value: any
}

export class Device extends Model {
    device_id!: string
    token?: string
    notifications_enabled!: boolean
    os!: string
    model!: string
    app_build!: string
    app_version!: string

    get isPushEnabled(): boolean {
        return this.token != null && this.notifications_enabled
    }
}

export type DeviceParams = Omit<Device, ModelParams | 'notifications_enabled' | 'isPushEnabled'> & ClientIdentity

interface PushEnabledDevice extends Device {
    token: string
}

export class User extends Model {
    project_id!: number
    anonymous_id!: string
    external_id!: string
    email?: string
    phone?: string
    devices?: Device[]
    data!: Record<string, any> // first_name, last_name live in data
    attributes!: UserAttribute[] // ???

    static jsonAttributes = ['data', 'devices']
    static virtualAttributes = ['firstName', 'lastName', 'fullName']

    flatten(): TemplateUser {
        return {
            ...this.data,
            email: this.email,
            phone: this.phone,
            id: this.external_id,
        }
    }

    get pushEnabledDevices(): PushEnabledDevice[] {
        return this.devices?.filter(device => device.isPushEnabled) as PushEnabledDevice[]
    }

    get fullName() {
        const parts = []
        if (this.firstName) {
            parts.push(this.firstName)
        }
        if (this.lastName) {
            parts.push(this.lastName)
        }
        return parts.join(' ') || null
    }

    get firstName() {
        return this.data.first_name ?? this.data.firstName ?? this.data.name
    }

    get lastName() {
        return this.data.last_name ?? this.data.lastName
    }
}

export type UserParams = Partial<Pick<User, 'email' | 'phone' | 'data'>> & ClientIdentity
