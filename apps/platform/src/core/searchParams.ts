import { JSONSchemaType } from 'ajv'
import { BaseModel } from './Model'

export interface PageParams {
    limit: number
    sort?: string
    direction?: string
    cursor?: string
    page?: 'prev' | 'next'
    q?: string
    filter?: Record<string, any>
    tag?: string[]
    id?: number[]
}

export interface PageQueryParams<T extends typeof BaseModel> extends PageParams {
    fields?: Array<keyof InstanceType<T> | string>
    mode?: 'exact' | 'partial'
}

export const SearchSchema = (id: string, defaults?: Partial<PageParams>): JSONSchemaType<PageParams> => {
    return {
        $id: id,
        type: 'object',
        required: ['limit'],
        properties: {
            cursor: {
                type: 'string',
                nullable: true,
            },
            page: {
                type: 'string',
                enum: ['prev', 'next'],
                nullable: true,
            },
            limit: {
                type: 'integer',
                default: defaults?.limit ?? 25,
                minimum: -1, // -1 for all
            },
            q: {
                type: 'string',
                nullable: true,
            },
            filter: {
                nullable: true,
                type: 'object',
            },
            sort: {
                type: 'string',
                default: defaults?.sort,
                nullable: true,
            },
            direction: {
                type: 'string',
                nullable: true,
                default: defaults?.direction,
                enum: ['asc', 'desc'],
            },
            tag: {
                type: 'array',
                items: {
                    type: 'string',
                },
                nullable: true,
            },
            id: {
                type: 'array',
                items: {
                    type: 'integer',
                    minimum: 1,
                },
                nullable: true,
            },
        },
    }
}

export const searchParamsSchema: JSONSchemaType<PageParams> = SearchSchema('searchParams')
