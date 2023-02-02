import Model, { ModelParams } from '../core/Model'
import { JSONSchemaType } from '../core/validate'

export type ProviderGroup = 'email' | 'text' | 'push' | 'webhook'

export default class Provider extends Model {
    name!: string
    project_id!: number
    external_id?: string
    group!: ProviderGroup
    data!: Record<string, any>
    is_default!: boolean

    static get cacheKey() {
        return {
            external(externalId: string) {
                return `providers_external_${externalId}`
            },
            internal(id: number) {
                return `providers_${id}`
            },
        }
    }

    static externalCacheKey(externalId: string) {
        return `providers_${externalId}`
    }

    parseJson(json: any): void {
        super.parseJson(json)

        Object.assign(this, this.data)
    }
}

export type ProviderMap<T extends Provider> = (record: any) => T

export type ProviderParams = Omit<Provider, ModelParams>

export type ExternalProviderParams = Omit<ProviderParams, 'name' | 'group'>

export const ProviderSchema = <T extends ExternalProviderParams, D>(id: string, data: JSONSchemaType<D>): JSONSchemaType<T> => {
    return {
        $id: id,
        type: 'object',
        required: ['project_id', 'data', 'is_default'],
        properties: {
            project_id: {
                type: 'integer',
            },
            external_id: {
                type: 'string',
                nullable: true,
            },
            is_default: {
                type: 'boolean',
            },
            data,
        },
        additionalProperties: false,
    } as any
}
