import { ClientIdentity } from '../client/Client'
import Model, { ModelParams } from '../core/Model'
import parsePhoneNumber from 'libphonenumber-js'

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

export interface Device {
    device_id: string
    token?: string
    os?: string
    os_version?: string
    model?: string
    app_build?: string
    app_version?: string
}

export type DeviceParams = Omit<Device, ModelParams> & ClientIdentity

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
    timezone?: string
    locale?: string

    static jsonAttributes = ['data', 'devices']
    static virtualAttributes = ['firstName', 'lastName', 'fullName']

    flatten(): TemplateUser {
        return {
            ...this.data,
            email: this.email,
            phone: this.phone,
            id: this.external_id,
            external_id: this.external_id,
            created_at: this.created_at,
            locale: this.locale,
            timezone: this.timezone,
        }
    }

    get pushEnabledDevices(): PushEnabledDevice[] {
        return this.devices?.filter(device => device.token != null) as PushEnabledDevice[] ?? []
    }

    get fullName() {
        // Handle case were user has a full name attribute in data
        const fullName = this.data.full_name ?? this.data.fullName
        if (fullName) return fullName

        // If no attribute exists, combine first and last name
        const parts: string[] = []
        if (this.firstName) {
            parts.push(this.firstName)
        }
        if (this.lastName) {
            parts.push(this.lastName)
        }
        return parts.join(' ') || null
    }

    get firstName(): string {
        return this.data.first_name ?? this.data.firstName ?? this.data.name
    }

    get lastName(): string {
        return this.data.last_name ?? this.data.lastName ?? this.data.surname
    }

    static formatJson(json: Record<string, any>): Record<string, unknown> {
        if (json.phone) {
            const parsedNumber = parsePhoneNumber(json.phone)
            if (parsedNumber) {
                json.data = {
                    ...json.data,
                    phone_country: parsedNumber.country,
                    phone_is_valid: parsedNumber.isValid(),
                }
            }
        }
        return super.formatJson(json)
    }

    toJSON() {
        const json = super.toJSON()

        if (this.phone) {
            const parsedNumber = parsePhoneNumber(this.phone)
            if (parsedNumber) {
                json.phone = parsedNumber.formatInternational()
            }
        }

        return json
    }
}

export type UserParams = Partial<Pick<User, 'email' | 'phone' | 'timezone' |'locale' | 'data'>> & ClientIdentity
export type UserInternalParams = Partial<Pick<User, 'email' | 'phone' | 'timezone' |'locale' | 'created_at' | 'data'>> & ClientIdentity
