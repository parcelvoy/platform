import { JSONSchemaType } from "ajv";
import { ProjectParams } from "../models/Project";

export const projectCreateParams: JSONSchemaType<ProjectParams> = {
    type: 'object',
    required: ['name'],
    properties: {
        name: {
            type: 'string'
        },
        description: {
            type: 'string',
            nullable: true
        }
    },
    additionalProperties: false,
}

export const projectUpdateParams: JSONSchemaType<Partial<ProjectParams>> = {
    type: 'object',
    properties: {
        name: {
            type: 'string',
            nullable: true,
        },
        description: {
            type: 'string',
            nullable: true
        }
    },
    additionalProperties: false,
}
