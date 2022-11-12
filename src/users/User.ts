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
    external_id!: string
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

export type DeviceParams = Omit<Device, ModelParams | 'notifications_enabled' | 'isPushEnabled'> & { user_id: string }

interface PushEnabledDevice extends Device {
    token: string
}

export class User extends Model {
    project_id!: number
    uuid!: string
    external_id!: string
    email?: string
    phone?: string
    devices!: Device[]
    data!: Record<string, any> // first_name, last_name live in data
    attributes!: UserAttribute[] // ???

    static jsonAttributes = ['data', 'devices']

    flatten(): TemplateUser {
        return {
            ...this.data,
            email: this.email,
            phone: this.phone,
            id: this.external_id,
        }
    }

    get pushEnabledDevices(): PushEnabledDevice[] {
        return this.devices.filter(device => device.isPushEnabled) as PushEnabledDevice[]
    }
}

export type UserParams = Pick<User, 'external_id'> & Partial<Pick<User, 'email' | 'phone' | 'data'>>
