import Router from '@koa/router'
import Model, { ModelParams } from '../core/Model'
import { JSONSchemaType } from '../core/validate'

export type ProviderGroup = 'email' | 'text' | 'push' | 'webhook' | 'analytics'
export interface ProviderMeta {
    name: string
    description?: string
    url?: string
    icon?: string
    type: string
    channel: string
    schema?: any
    paths?: Record<string, string>
}

export const ProviderSchema = <T extends ExternalProviderParams, D>(id: string, data: JSONSchemaType<D>): JSONSchemaType<T> => {
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
                description: 'The per second maximum send rate.',
                nullable: true,
            },
        },
        additionalProperties: false,
    } as any
}

export default class Provider extends Model {
    type!: string
    name!: string
    project_id!: number
    group!: ProviderGroup
    data!: Record<string, any>
    is_default!: boolean
    rate_limit!: number

    static jsonAttributes = ['data']

    static namespace = this.name
    static meta: Omit<ProviderMeta, 'channel' | 'type'> = {
        name: '',
        description: '',
        url: '',
        paths: {},
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

    static schema: any = ProviderSchema('providerParams', {
        type: 'object',
        nullable: true,
        additionalProperties: true,
    } as any)
}

export type ProviderMap<T extends Provider> = (record: any) => T

export type ProviderParams = Omit<Provider, ModelParams>

export type ExternalProviderParams = Omit<ProviderParams, 'group'>

export interface ProviderControllers {
    admin: Router
    public?: Router
}
