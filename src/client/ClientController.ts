import Router from '@koa/router'
import App from '../app'
import EventPostJob from './EventPostJob'
import { JSONSchemaType, validate } from '../core/validate'
import { ClientAliasParams, ClientIdentifyParams, ClientPostEventsRequest } from './Client'
import { aliasUser, createUser } from '../users/UserRepository'
import { ProjectState } from '../auth/AuthMiddleware'
import { projectMiddleware } from '../projects/ProjectController'

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

// router.patch('/users/devices', async ctx => {

// })

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
