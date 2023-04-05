import { JSONSchemaType } from 'ajv'

export interface SearchParams {
    page: number
    itemsPerPage: number
    q?: string
    sort?: string
    direction?: string
    tag?: string[]
    id?: number[]
}

export const SearchSchema = (id: string, defaults?: Partial<SearchParams>): JSONSchemaType<SearchParams> => {
    return {
        $id: id,
        type: 'object',
        required: ['page', 'itemsPerPage'],
        properties: {
            page: {
                type: 'integer',
                default: defaults?.page ?? 0,
                minimum: 0,
            },
            itemsPerPage: {
                type: 'integer',
                default: defaults?.itemsPerPage ?? 25,
                minimum: -1, // -1 for all
            },
            q: {
                type: 'string',
                nullable: true,
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

export const searchParamsSchema: JSONSchemaType<SearchParams> = SearchSchema('searchParams')
