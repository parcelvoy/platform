import { JSONSchemaType } from 'ajv'

export interface SearchParams {
    page: number
    itemsPerPage: number
    q?: string
    sort?: string
    tag?: string[]
}

export const searchParamsSchema: JSONSchemaType<SearchParams> = {
    $id: 'searchParams',
    type: 'object',
    required: ['page', 'itemsPerPage'],
    properties: {
        page: {
            type: 'integer',
            default: 0,
            minimum: 0,
        },
        itemsPerPage: {
            type: 'integer',
            default: 25,
            minimum: -1, // -1 for all
        },
        q: {
            type: 'string',
            nullable: true,
        },
        sort: {
            type: 'string',
            nullable: true,
        },
        tag: {
            type: 'array',
            items: {
                type: 'string',
            },
            nullable: true,
        },
    },
}
