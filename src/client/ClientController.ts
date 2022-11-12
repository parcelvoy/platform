import Router from '@koa/router'
import App from '../app'
import EventPostJob from './EventPostJob'
import { JSONSchemaType, validate } from '../core/validate'
import { ClientAliasParams, ClientIdentifyParams, ClientPostEventsRequest } from './Client'
import { aliasUser, createUser, getUserFromClientId, saveDevice } from '../users/UserRepository'
import { ProjectState } from '../auth/AuthMiddleware'
import { projectMiddleware } from '../projects/ProjectController'
import { DeviceParams } from '../users/User'

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
    ctx.body = aliasUser(ctx.state.project.id, payload)
})

/**
 * Identify User
 * Used by client libraries to identify and populate a single user
 * using a provider external ID
 */
const identifyParams: JSONSchemaType<ClientIdentifyParams> = {
    $id: 'identifyParams',
    type: 'object',
    properties: {
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
}
router.patch('/identify', async ctx => {
    const payload = validate(identifyParams, ctx.request.body)
    ctx.body = await createUser(payload)
})

/**
 * Register Device
 * Used by client libraries to register devices and their respective
 * tokens for push notifications.
 */
const deviceParams: JSONSchemaType<DeviceParams> = {
    $id: 'deviceParams',
    type: 'object',
    required: ['user_id', 'external_id', 'os', 'model', 'app_build', 'app_version'],
    properties: {
        user_id: {
            type: 'string',
        },
        external_id: {
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
}
router.patch('/devices', async ctx => {
    const payload = validate(deviceParams, ctx.request.body)
    const user = await getUserFromClientId(ctx.state.project.id, payload.user_id)
    if (!user) {
        ctx.throw(404)
        return
    }
    ctx.body = await saveDevice(user, payload)
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
            },
        },
    },
    minItems: 1,
}
router.post('/events', async ctx => {
    console.log('events')
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
