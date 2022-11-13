import Router from '@koa/router'
import Project, { ProjectParams } from './Project'
import type App from '../app'
import { JSONSchemaType, validate } from '../core/validate'
import { extractQueryParams } from '../utilities'
import { searchParamsSchema } from '../core/searchParams'
import { Context } from 'koa'
import { getProject } from './ProjectService'
import { AuthState } from '../config/controllers'

export async function projectMiddleware(ctx: Context, next: () => void) {
    ctx.state.project = await getProject(
        ctx.params.project,
        ctx.state.admin.id,
    )
    if (!ctx.state.project) {
        ctx.throw(404)
        return
    }
    return await next()
}

const router = new Router<AuthState>({ prefix: '/projects' })

router.get('/', async ctx => {
    ctx.body = await Project.searchParams(extractQueryParams(ctx.request.query, searchParamsSchema), ['name'])
})

router.get('/all', async ctx => {
    ctx.body = await Project.all()
})

const projectCreateParams: JSONSchemaType<ProjectParams> = {
    $id: 'projectCreate',
    type: 'object',
    required: ['name'],
    properties: {
        name: {
            type: 'string',
        },
        description: {
            type: 'string',
            nullable: true,
        },
    },
    additionalProperties: false,
}

router.post('/', async ctx => {
    ctx.body = await Project.insertAndFetch(validate(projectCreateParams, ctx.request.body))
})

export default router

const subrouter = new Router<{
    app: App
    project?: Project
}>()

subrouter.get('/', async ctx => {
    ctx.body = ctx.state.project
})

const projectUpdateParams: JSONSchemaType<Partial<ProjectParams>> = {
    $id: 'projectUpdate',
    type: 'object',
    properties: {
        name: {
            type: 'string',
            nullable: true,
        },
        description: {
            type: 'string',
            nullable: true,
        },
    },
    additionalProperties: false,
}

subrouter.patch('/', async ctx => {
    ctx.body = await Project.updateAndFetch(ctx.state.project!.id, validate(projectUpdateParams, ctx.request.body))
})

export { subrouter as ProjectSubrouter }
