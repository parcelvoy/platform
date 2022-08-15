import Router from "@koa/router"
import { projectCreateParams, projectUpdateParams } from "../schemas/projects"
import { Project } from "../models/Project"
import type App from '../app'

const PROJECT = 'project'
const USER = 'user'

const router = new Router<{ 
    app: App
    project?: Project
}>({
    prefix: '/projects'
})

router.get('/', async ctx => {
    ctx.body = await ctx.state.app.db(PROJECT).orderBy('created_at', 'desc')
})

router.post('/', async ctx => {
    const payload = ctx.state.app.validate(projectCreateParams, ctx.request.body)
    const [id] = await ctx.state.app.db(PROJECT).insert(payload)
    ctx.body = await ctx.state.app.db(PROJECT).first().where({ id })
})

router.param('project', async (value, ctx, next) => {
    ctx.state.project = await ctx.state.app.db(PROJECT).first().where({ id: parseInt(value, 10) })
    if (!ctx.state.project) {
        ctx.throw(404)
        return
    }
    return await next()
})

router.get('/:project', async ctx => {
    ctx.body = ctx.state.project
})

router.patch('/:project', async ctx => {
    const project = ctx.state.project!
    if (!Object.keys(ctx.request.body).length) {
        ctx.body = ctx.state.project
        return
    }
    const payload = ctx.state.app.validate(projectUpdateParams, ctx.request.body)
    await ctx.state.app.db(PROJECT).update(payload).where({ id: project.id })
    ctx.body = ctx.state.project = await ctx.state.app.db(PROJECT).first().where({ id: project.id })
})

router.get('/:project/users', async ctx => {
    ctx.body = await ctx.state.app.db(USER).where({ project_id: ctx.state.project!.id })
})

export default router
