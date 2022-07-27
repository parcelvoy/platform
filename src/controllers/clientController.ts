import Router from "@koa/router"
import { ProjectApiKey } from "../models/Project"
import type App from "../app"
import { deleteUsersRequest, patchUsersRequest, postEventsRequest } from "../schemas/client"
import UserPatchJob from "../job/UserPatchJob"
import UserDeleteJob from "../job/UserDeleteJob"
import EventPostJob from "../job/EventPostJob"

const router = new Router<{ 
    app: App 
    apikey: ProjectApiKey
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

    const apiKey = await ctx.state.app.db('project_api_key').first().where({ value })
    console.log(apiKey)
    if (!apiKey || apiKey.deleted_at) {
        ctx.throw(401, 'invalid api key')
        return
    }

    ctx.state.apikey = apiKey

    return next()
})

router.patch('/users', async ctx => {

    const validate = ctx.state.app.validator.compile(patchUsersRequest)

    if (!validate(ctx.request.body)) {
        ctx.throw(422, JSON.stringify(validate.errors))
        return
    }

    await ctx.state.app.queue.enqueue(UserPatchJob.from({
        project_id: ctx.state.apikey.project_id,
        request: ctx.request.body
    }))

    ctx.status = 204
    ctx.body = ''
})

router.delete('/users', async ctx => {

    const validate = ctx.state.app.validator.compile(deleteUsersRequest)

    let userIds = ctx.request.query['user_id'] || []
    if (!Array.isArray(userIds)) userIds = [userIds]

    console.log(userIds)
    
    if (!validate(userIds)) {
        ctx.throw(422, JSON.stringify(validate.errors))
        return
    }

    await ctx.state.app.queue.enqueue(UserDeleteJob.from({
        project_id: ctx.state.apikey.project_id,
        request: userIds
    }))

    ctx.status = 204
    ctx.body = ''
})

router.post('/events', async ctx => {

    const validate = ctx.state.app.validator.compile(postEventsRequest)

    if (!validate(ctx.request.body)) {
        ctx.throw(422, JSON.stringify(validate.errors))
        return
    }
    
    await ctx.state.app.queue.enqueue(EventPostJob.from({
        project_id: ctx.state.apikey.project_id,
        request: ctx.request.body
    }))

    ctx.status = 204
    ctx.body = ''
})

export default router
