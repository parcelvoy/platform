import Router from "@koa/router"
import type App from "../app"
import { deleteUsersRequest, patchUsersRequest, postEventsRequest } from "../schemas/client"
import UserPatchJob from "../job/UserPatchJob"
import UserDeleteJob from "../job/UserDeleteJob"
import EventPostJob from "../job/EventPostJob"

const router = new Router<{ 
    app: App
    project_id: number
}>({
    prefix: '/client'
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

router.patch('/users', async ctx => {

    const validate = ctx.state.app.validator.compile(patchUsersRequest)

    if (!validate(ctx.request.body)) {
        ctx.throw(422, JSON.stringify(validate.errors))
        return
    }

    const users = ctx.state.app.validate(patchUsersRequest, ctx.request.body)

    for (const user of users) {
        await ctx.state.app.queue.enqueue(UserPatchJob.from({
            project_id: ctx.state.project_id,
            user
        }))
    }

    ctx.status = 204
    ctx.body = ''
})

router.delete('/users', async ctx => {

    let userIds = ctx.request.query.user_id || []
    if (!Array.isArray(userIds)) userIds = userIds.length ? [userIds] : []

    userIds = ctx.state.app.validate(deleteUsersRequest, userIds)
    
    for (const external_id of userIds) {
        await ctx.state.app.queue.enqueue(UserDeleteJob.from({
            project_id: ctx.state.project_id,
            external_id
        }))
    }

    ctx.status = 204
    ctx.body = ''
})

router.post('/events', async ctx => {

    const events = ctx.state.app.validate(postEventsRequest, ctx.request.body)

    for (const event of events) {
        await ctx.state.app.queue.enqueue(EventPostJob.from({
            project_id: ctx.state.project_id,
            event
        }))
    }

    ctx.status = 204
    ctx.body = ''
})

export default router
