import Router from '@koa/router'
import Model, { ModelParams } from '../core/Model'
import { JSONSchemaType } from '../core/validate'
import type App from '../app'
import { Context } from 'koa'

export type ProviderGroup = 'email' | 'text' | 'push' | 'webhook' | 'analytics'
export interface ProviderMeta {
    name: string
    description?: string
    url?: string
    icon?: string
    type: string
    group: string | ProviderGroup
    schema?: any
}

export interface ProviderOptions {
    filter?: (ctx: Context) => boolean
}

export interface ProviderSetupMeta {
    name: string
    value: string | number
}

export function ProviderSchema<_ extends ExternalProviderParams, D>(id: string, data: JSONSchemaType<D>): any {
    return {
        $id: id,
        type: 'object',
        required: ['data'],
        properties: {
            name: {
                type: 'string',
                nullable: true,
            },
            is_default: {
                type: 'boolean',
                nullable: true,
            },
            data,
            rate_limit: {
                type: 'number',
                description: 'The per interval maximum send rate.',
                nullable: true,
            },
            rate_interval: {
                type: 'string',
                nullable: true,
            },
        },
        additionalProperties: false,
    } as any
}

type RateInterval = 'second' | 'minute' | 'hour' | 'day'

export default class Provider extends Model {
    type!: string
    name!: string
    project_id!: number
    group!: ProviderGroup
    data!: Record<string, any>
    is_default!: boolean
    rate_limit!: number
    rate_interval!: RateInterval
    setup!: ProviderSetupMeta[]
    deleted_at?: Date

    static jsonAttributes = ['data']

    static namespace = this.name
    static meta: Omit<ProviderMeta, 'group' | 'type'> = {
        name: '',
        description: '',
        url: '',
    }

    static get cacheKey() {
        return {
            internal(id: number) {
                return `providers:id:${id}`
            },
            default(projectId: number, group: string) {
                return `providers:project:${projectId}:${group}`
            },
        }
    }

    parseJson(json: any): void {
        super.parseJson(json)

        Object.assign(this, this.data)
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    loadSetup(app: App): ProviderSetupMeta[] { return [] }

    static schema: any = ProviderSchema('providerParams', {
        type: 'object',
        nullable: true,
        additionalProperties: true,
    } as any)

    static controllers(): Partial<ProviderControllers> {
        return {}
    }

    static get group(): ProviderGroup {
        throw new Error('Group not defined.')
    }

    static get options(): ProviderOptions { return {} }

    get interval() {
        const intervals = {
            second: 1000,
            minute: 60 * 1000,
            hour: 60 * 60 * 1000,
            day: 24 * 60 * 60 * 1000,
        }
        return intervals[this.rate_interval || 'second']
    }

    ratePer(period: RateInterval) {
        const intervals = {
            second: 1,
            minute: 60,
            hour: 60 * 60,
            day: 24 * 60 * 60,
        }
        return this.rate_limit * intervals[period]
    }
}

export type ProviderMap<T extends Provider> = (record: any) => T

export type ProviderParams = Omit<Provider, ModelParams | 'setup' | 'loadSetup' | 'interval' | 'ratePer'>

export type ExternalProviderParams = Omit<ProviderParams, 'group'>

export interface ProviderControllers {
    admin: Router
    public?: Router
}
