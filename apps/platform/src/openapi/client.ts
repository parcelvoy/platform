import { aliasParams, deviceParams, identifyParams, postEventsRequest } from '../client/ClientController'
import App from '../app'
import { OpenAPIV3_1 } from 'openapi-types'

export const createClientSchema = (app: App) => {

    const tags = ['Client']

    return {
        openapi: '3.1.0',
        info: {
            version: '1.0.0', // TODO: dynamic
            title: 'Parcelvoy Client API',
            description: '',
        },
        servers: [
            {
                url: app.env.apiBaseUrl + '/client',
            },
        ],
        paths: {
            '/alias': {
                post: {
                    tags,
                    description: 'Associate an anonymous user to one identified by your system.',
                    operationId: 'alias',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/aliasParams',
                                },
                            },
                        },
                    },
                    responses: {
                        204: {
                            description: 'Success, processed asynchronously.',
                        },
                    },
                },
            },
            '/identify': {
                post: {
                    tags,
                    description: 'Identify and populate a single user by external ID (your system\'s ID).',
                    operationId: 'identify',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/identifyParams',
                                },
                            },
                        },
                    },
                    responses: {
                        204: {
                            description: 'Success, processed asynchronously.',
                        },
                    },
                },
            },
            '/devices': {
                post: {
                    tags,
                    description: 'Register device tokens for push notifications.',
                    operationId: 'registerDevice',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/deviceParams',
                                },
                            },
                        },
                    },
                    responses: {
                        204: {
                            description: 'Success, processed asynchronously.',
                        },
                    },
                },
            },
            '/events': {
                post: {
                    tags,
                    description: 'Register device tokens for push notifications.',
                    operationId: 'postEvents',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/postEventsRequest',
                                },
                            },
                        },
                    },
                    responses: {
                        204: {
                            description: 'asynchronously.',
                        },
                    },
                },
            },
        },
        components: {
            schemas: {
                aliasParams: aliasParams as OpenAPIV3_1.SchemaObject,
                deviceParams: deviceParams as OpenAPIV3_1.SchemaObject,
                postEventsRequest: postEventsRequest as OpenAPIV3_1.SchemaObject,
                identifyParams: identifyParams as OpenAPIV3_1.SchemaObject,
            },
            securitySchemes: {
                ProjectApiKey: {
                    description: 'Public or secret API key from your Project.',
                    type: 'apiKey',
                    in: 'header',
                    name: 'x-parcelvoy-api-key',
                },
            },
        },
        security: [
            {
                type: ['ProjectApiKey'],
            },
        ],
    } satisfies OpenAPIV3_1.Document
}
