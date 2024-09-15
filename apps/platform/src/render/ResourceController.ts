import Router from '@koa/router'
import { ProjectState } from '../auth/AuthMiddleware'
import { JSONSchemaType, validate } from '../core/validate'
import Resource, { ResourceParams, ResourceType } from './Resource'
import { allResources, createResource, deleteResource, getResource } from './ResourceService'

const router = new Router<
    ProjectState & { resource?: Resource }
>({
    prefix: '/resources',
})

router.get('/', async ctx => {
    const type = ctx.query.type as ResourceType
    ctx.body = await allResources(ctx.state.project.id, type)
})

const resourceCreateParams: JSONSchemaType<ResourceParams> = {
    $id: 'resourceCreateParams',
    type: 'object',
    required: ['type', 'name', 'value'],
    properties: {
        type: {
            type: 'string',
            enum: ['font', 'snippet'],
        },
        name: { type: 'string' },
        value: {
            type: 'object',
            additionalProperties: true,
        } as any,
    },
    additionalProperties: false,
}
router.post('/', async ctx => {
    const payload = validate(resourceCreateParams, ctx.request.body)
    ctx.body = await createResource(ctx.state.project.id, payload)
})

router.param('resourceId', async (value: string, ctx, next) => {
    ctx.state.resource = await getResource(parseInt(value, 10), ctx.state.project.id)
    if (!ctx.state.resource) {
        ctx.throw(404)
        return
    }
    return await next()
})

router.delete('/:resourceId', async ctx => {
    const { id, project_id } = ctx.state.resource!
    await deleteResource(id, project_id)
    ctx.body = true
})

export default router
