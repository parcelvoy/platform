import Router from '@koa/router'
import { JSONSchemaType, validate } from '../core/validate'
import { extractQueryParams } from '../utilities'
import List, { ListParams } from './List'
import { createList, getList, pagedLists } from './ListService'
import { searchParamsSchema } from '../core/searchParams'
import { ProjectState } from '../auth/AuthMiddleware'

const router = new Router<
    ProjectState & { list?: List }
>({
    prefix: '/lists',
})

router.get('/', async ctx => {
    const params = extractQueryParams(ctx.query, searchParamsSchema)
    ctx.body = await pagedLists(params, ctx.state.project.id)
})

const listParams: JSONSchemaType<ListParams> = {
    $id: 'listParams',
    type: 'object',
    required: ['name', 'rules'],
    definitions: {
        rule: {
            type: 'object',
            required: ['type', 'group', 'path', 'operator'],
            properties: {
                type: { type: 'string', enum: ['wrapper', 'string', 'number', 'boolean', 'date', 'array'] },
                group: { type: 'string', enum: ['user', 'event'] },
                path: { type: 'string' },
                operator: { type: 'string' },
                value: {
                    type: ['string', 'number', 'boolean'],
                    nullable: true,
                },
                children: {
                    type: 'array',
                    nullable: true,
                    minItems: 0,
                    items: ({
                        $ref: '#/definitions/rule',
                    } as any),
                },
            },
            additionalProperties: false,
        },
    },
    properties: {
        name: {
            type: 'string',
        },
        rules: {
            type: 'array',
            minItems: 1,
            items: ({ $ref: '#/definitions/rule' } as any),
        },
    },
    additionalProperties: false,
}

router.post('/', async ctx => {
    const payload = validate(listParams, ctx.request.body)
    ctx.body = await createList(ctx.state.project.id, payload)
})

router.param('listId', async (value, ctx, next) => {
    ctx.state.list = await getList(parseInt(value, 10), ctx.state.project.id)
    if (!ctx.state.list) {
        ctx.throw(404)
        return
    }
    return await next()
})

router.get('/:listId', async ctx => {
    ctx.body = ctx.state.list
})

router.patch('/:listId', async ctx => {
    const payload = validate(listParams, ctx.request.body)
    ctx.body = await List.updateAndFetch(ctx.state.list!.id, payload)
})

export default router
