import Router from '@koa/router'
import App from '../app'
import UserPatchJob from './UserPatchJob'
import UserDeleteJob from './UserDeleteJob'
import EventPostJob from './EventPostJob'
import { JSONSchemaType, validate } from '../core/validate'
import { ClientDeleteUsersRequest, ClientPatchUsersRequest, ClientPostEventsRequest } from './Client'

const router = new Router<{
    app: App
    project_id: number
}>({
    prefix: '/client',
})

router.use(async (ctx, next) => {

    let value = ctx.request.headers['x-parcelvoy-api-key']
    if (Array.isArray(value)) value = value[0]
    if (!value) {
        ctx.throw(401, 'missing api key header')
        return
    }

    const apiKey = await ctx.state.app.db('project_api_keys').first().where({ value })
    if (!apiKey || apiKey.deleted_at) {
        ctx.throw(401, 'invalid api key')
        return
    }

    ctx.state.project_id = apiKey.project_id

    return next()
})

const patchUsersRequest: JSONSchemaType<ClientPatchUsersRequest> = {
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
                additionalProperties: true,
            },
        },
    },
    minItems: 1,
}

router.patch('/users', async ctx => {

    const users = validate(patchUsersRequest, ctx.request.body)

    for (const user of users) {
        await App.main.queue.enqueue(UserPatchJob.from({
            project_id: ctx.state.project_id,
            user,
        }))
    }

    ctx.status = 204
    ctx.body = ''
})

const deleteUsersRequest: JSONSchemaType<ClientDeleteUsersRequest> = {
    type: 'array',
    items: {
        type: 'string',
    },
    minItems: 1,
}

router.delete('/users', async ctx => {

    let userIds = ctx.request.query.user_id || []
    if (!Array.isArray(userIds)) userIds = userIds.length ? [userIds] : []

    userIds = validate(deleteUsersRequest, userIds)

    for (const externalId of userIds) {
        await App.main.queue.enqueue(UserDeleteJob.from({
            project_id: ctx.state.project_id,
            external_id: externalId,
        }))
    }

    ctx.status = 204
    ctx.body = ''
})

const postEventsRequest: JSONSchemaType<ClientPostEventsRequest> = {
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

    const events = validate(postEventsRequest, ctx.request.body)

    for (const event of events) {
        await App.main.queue.enqueue(EventPostJob.from({
            project_id: ctx.state.project_id,
            event,
        }))
    }

    ctx.status = 204
    ctx.body = ''
})

export default router
