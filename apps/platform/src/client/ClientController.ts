import Router from '@koa/router'
import App from '../app'
import EventPostJob from './EventPostJob'
import { JSONSchemaType, validate } from '../core/validate'
import { ClientAliasParams, ClientIdentifyParams, ClientPostEventsRequest } from './Client'
import { aliasUser, saveDevice } from '../users/UserRepository'
import { ProjectState } from '../auth/AuthMiddleware'
import { projectMiddleware } from '../projects/ProjectController'
import { DeviceParams } from '../users/User'
import UserPatchJob from '../users/UserPatchJob'

const router = new Router<ProjectState>()

router.use(projectMiddleware)

/**
 * Alias User
 * Used by client libraries to associate an anonymous user
 * to one as identified by their system
 */
const aliasParams: JSONSchemaType<ClientAliasParams> = {
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
    const payload = validate(aliasParams, ctx.request.body)
    await aliasUser(ctx.state.project.id, payload)
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
    await App.main.queue.enqueue(UserPatchJob.from({
        project_id: ctx.state.project.id,
        user,
    }))

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
    const payload = validate(deviceParams, ctx.request.body)
    await saveDevice(ctx.state.project.id, payload)

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
        await App.main.queue.enqueue(EventPostJob.from({
            project_id: ctx.state.project.id,
            event,
        }))
    }

    ctx.status = 204
    ctx.body = ''
})

export default router
