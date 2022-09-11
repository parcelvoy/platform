import Router from '@koa/router'
import type App from '../app'
import { JSONSchemaType, validate } from '../core/validate'
import List, { ListParams } from './List'
import { allLists, createList, getList } from './ListService'

const router = new Router<{
    app: App
    list?: List
    user: { project_id: number }
}>({
    prefix: '/lists',
})

router.get('/', async ctx => {
    ctx.body = await allLists(ctx.state.user.project_id)
})

const listParams: JSONSchemaType<ListParams> = {
    $id: 'listParams',
    type: 'object',
    required: ['name', 'project_id', 'rules'],
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
        project_id: {
            type: 'integer',
        },
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
    ctx.body = await createList(payload)
})

router.param('listId', async (value, ctx, next) => {
    ctx.state.list = await getList(parseInt(ctx.params.listId), ctx.state.user.project_id)
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
