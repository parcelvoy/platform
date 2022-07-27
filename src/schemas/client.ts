import type { JSONSchemaType } from "ajv";
import type { ClientDeleteUsersRequest, ClientPatchUsersRequest, ClientPostEventsRequest } from "models/client";

export const patchUsersRequest: JSONSchemaType<ClientPatchUsersRequest> = {
    type: 'array',
    items: {
        type: 'object',
        required: ['external_id'],
        properties: {
            external_id: {
                type: 'string',
            },
            email: {
                type: 'string',
                nullable: true,
            },
            phone: {
                type: 'string',
                nullable: true,
            },
            data: {
                type: 'object',
                nullable: true,
                additionalProperties: true
            }
        }
    },
    minItems: 1,
}

export const deleteUsersRequest: JSONSchemaType<ClientDeleteUsersRequest> = {
    type: 'array',
    items: {
        type: 'string'
    },
    minItems: 1,
}

export const postEventsRequest: JSONSchemaType<ClientPostEventsRequest> = {
    type: 'array',
    items: {
        type: 'object',
        required: ['name', 'user_id'],
        properties: {
            name: {
                type: 'string',
            },
            user_id: {
                type: 'string',
            },
            data: {
                type: 'object',
                nullable: true,
                additionalProperties: true,
            }
        }
    },
    minItems: 1,
}
