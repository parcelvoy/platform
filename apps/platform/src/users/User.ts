import { ClientIdentity } from '../client/Client'
import { UniversalModel } from '../core/Model'
import parsePhoneNumber from 'libphonenumber-js'
import { SubscriptionState } from '../subscriptions/Subscription'
import { Device } from './Device'

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

export class User extends UniversalModel {
    project_id!: number
    anonymous_id!: string
    external_id!: string
    email?: string
    phone?: string
    devices?: Device[]
    has_push_device!: boolean
    data!: Record<string, any> // first_name, last_name live in data
    unsubscribe_ids?: number[]
    timezone?: string
    locale?: string
    version!: number

    static jsonAttributes = ['data', 'devices', 'unsubscribe_ids']
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
            firstName: this.firstName,
            lastName: this.lastName,
            fullName: this.fullName,
        }
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

    subscriptionState(subscriptionId: number): SubscriptionState {
        return this.unsubscribe_ids?.includes(subscriptionId)
            ? SubscriptionState.unsubscribed
            : SubscriptionState.subscribed
    }

    static formatDb(json: any): Record<string, unknown> {
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
        return super.formatDb(json)
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
export type UserInternalParams = Partial<Pick<User, 'email' | 'phone' | 'timezone' |'locale' | 'created_at' | 'data' | 'unsubscribe_ids'>> & ClientIdentity
