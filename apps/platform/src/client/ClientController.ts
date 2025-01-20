import Router from '@koa/router'
import EventPostJob from './EventPostJob'
import { JSONSchemaType, validate } from '../core/validate'
import { ClientIdentifyParams, ClientIdentityKeys, ClientPostEventsRequest } from './Client'
import { ProjectState } from '../auth/AuthMiddleware'
import { projectMiddleware } from '../projects/ProjectController'
import { DeviceParams } from '../users/User'
import UserPatchJob from '../users/UserPatchJob'
import UserDeviceJob from '../users/UserDeviceJob'
import UserAliasJob from '../users/UserAliasJob'

const router = new Router<ProjectState>()
router.use(projectMiddleware)

/**
 * Alias User
 * Used by client libraries to associate an anonymous user
 * to one as identified by their system
 */
const aliasParams: JSONSchemaType<ClientIdentityKeys> = {
    $id: 'aliasParams',
    type: 'object',
    required: ['external_id', 'anonymous_id'],
    properties: {
        anonymous_id: {
            type: 'string',
        },
        external_id: {
            type: 'string',
        },
    },
}
router.post('/alias', async ctx => {
    const alias = validate(aliasParams, ctx.request.body)
    await UserAliasJob.from({
        project_id: ctx.state.project.id,
        ...alias,
    }).queue()
    ctx.status = 204
    ctx.body = ''
})

/**
 * Identify User
 * Used by client libraries to identify and populate a single user
 * using a provider external ID
 */
const identifyParams: JSONSchemaType<ClientIdentifyParams> = {
    $id: 'identifyParams',
    type: 'object',
    required: [],
    properties: {
        anonymous_id: {
            type: 'string',
            nullable: true,
        },
        external_id: {
            type: 'string',
            nullable: true,
        },
        email: {
            type: 'string',
            nullable: true,
        },
        phone: {
            type: 'string',
            nullable: true,
        },
        timezone: {
            type: 'string',
            format: 'timezone',
            nullable: true,
            errorMessage: {
                format: 'The timezone value must be in the IANA format.',
            },
        },
        locale: {
            type: 'string',
            nullable: true,
        },
        data: {
            type: 'object',
            nullable: true,
            additionalProperties: true,
        },
    },
    anyOf: [
        {
            required: ['anonymous_id'],
        },
        {
            required: ['external_id'],
        },
    ],
    additionalProperties: false,
} as any
router.post('/identify', async ctx => {
    const user = validate(identifyParams, ctx.request.body)
    await UserPatchJob.from({
        project_id: ctx.state.project.id,
        user,
    }).queue()

    ctx.status = 204
    ctx.body = ''
})

/**
 * Register Device
 * Used by client libraries to register devices and their respective
 * tokens for push notifications.
 */
const deviceParams: JSONSchemaType<DeviceParams> = {
    $id: 'deviceParams',
    type: 'object',
    required: ['device_id', 'os', 'model', 'app_build', 'app_version'],
    properties: {
        anonymous_id: {
            type: 'string',
            nullable: true,
        },
        external_id: {
            type: 'string',
            nullable: true,
        },
        device_id: {
            type: 'string',
        },
        token: {
            type: 'string',
            nullable: true,
        },
        os: {
            type: 'string',
        },
        os_version: {
            type: 'string',
        },
        model: {
            type: 'string',
        },
        app_build: {
            type: 'string',
        },
        app_version: {
            type: 'string',
        },
    },
    anyOf: [
        {
            required: ['anonymous_id'],
        },
        {
            required: ['external_id'],
        },
    ],
} as any
router.post('/devices', async ctx => {
    const device = validate(deviceParams, ctx.request.body)
    await UserDeviceJob.from({
        project_id: ctx.state.project.id,
        ...device,
    }).queue()

    ctx.status = 204
    ctx.body = ''
})

/**
 * Post Event
 * Used by client libraries to trigger an event that can be used
 * to execute a step in a journey or update a virtual list.
 */
const postEventsRequest: JSONSchemaType<ClientPostEventsRequest> = {
    $id: 'postEvents',
    type: 'array',
    items: {
        type: 'object',
        required: ['name'],
        properties: {
            name: {
                type: 'string',
            },
            anonymous_id: {
                type: 'string',
                nullable: true,
            },
            external_id: {
                type: 'string',
                nullable: true,
            },
            data: {
                type: 'object',
                nullable: true,
                additionalProperties: true,
            },
            user: {
                type: 'object',
                nullable: true,
                properties: {
                    email: {
                        type: 'string',
                        nullable: true,
                    },
                    phone: {
                        type: 'string',
                        nullable: true,
                    },
                    timezone: {
                        type: 'string',
                        nullable: true,
                    },
                    locale: {
                        type: 'string',
                        nullable: true,
                    },
                    data: {
                        type: 'object',
                        nullable: true,
                        additionalProperties: true,
                    },
                },
            },
        },
        anyOf: [
            {
                required: ['anonymous_id'],
            },
            {
                required: ['external_id'],
            },
        ],
    },
    minItems: 1,
} as any
router.post('/events', async ctx => {
    const events = validate(postEventsRequest, ctx.request.body)

    for (const event of events) {
        await EventPostJob.from({
            project_id: ctx.state.project.id,
            event,
        }).queue()
    }

    ctx.status = 204
    ctx.body = ''
})

export default router
