import Router from '@koa/router'
import Project, { ProjectParams } from './Project'
import type App from '../app'
import { JSONSchemaType, validate } from '../core/validate'
import { extractQueryParams } from '../utilities'
import { User } from '../users/User'
import { SearchParams } from '../core/Model'
import Journey from '../journey/Journey'
import Campaign from '../campaigns/Campaign'
import List from '../lists/List'

const router = new Router<{
    app: App
    project?: Project
}>({
    prefix: '/projects',
})

const searchParamsSchema: JSONSchemaType<SearchParams> = {
    $id: 'searchParams',
    type: 'object',
    required: ['page', 'itemsPerPage'],
    properties: {
        page: {
            type: 'number',
            default: 0,
            minimum: 0,
        },
        itemsPerPage: {
            type: 'number',
            default: 10,
            minimum: -1, //-1 for all
        },
        q: {
            type: 'string',
            nullable: true,
        },
        sort: {
            type: 'string',
            nullable: true,
        }
    }
}

router.get('/', async ctx => {
    ctx.body = await Project.searchParams(extractQueryParams(ctx.request.query, searchParamsSchema), ['name'])
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

router.param('project', async (value, ctx, next) => {
    ctx.state.project = await Project.find(value)
    if (!ctx.state.project) {
        ctx.throw(404)
        return
    }
    return await next()
})

router.get('/:project', async ctx => {
    ctx.body = ctx.state.project
})

const projectUpdateParams: JSONSchemaType<Partial<ProjectParams>> = {
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

router.patch('/:project', async ctx => {
    ctx.body = await Project.updateAndFetch(ctx.state.project!.id, validate(projectUpdateParams, ctx.request.body))
})

router.get('/:project/users', async ctx => {
    ctx.body = await User.searchParams(
        extractQueryParams(ctx.query, searchParamsSchema), 
        ['external_id', 'email', 'phone'],
        b => b.where({ project_id: ctx.state.project!.id })
    )
})

router.get('/:project/journeys', async ctx => {
    ctx.body = await Journey.searchParams(
        extractQueryParams(ctx.query, searchParamsSchema), 
        ['name'],
        b => b.where({ project_id: ctx.state.project!.id }),
    )
})

router.get('/:project/campaigns', async ctx => {
    ctx.body = await Campaign.searchParams(
        extractQueryParams(ctx.query, searchParamsSchema),
        ['name'],
        b => b.where({ project_id: ctx.state.project!.id }),
    )
})

router.get('/:project/lists', async ctx => {
    ctx.body = await List.searchParams(
        extractQueryParams(ctx.query, searchParamsSchema),
        ['name'],
        b => b.where({ project_id: ctx.state.project!.id }),
    )
})

export default router
