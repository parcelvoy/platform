import Router from '@koa/router'
import type App from '../app'
import { JSONSchemaType, validate } from '../core/validate'
import Template, { TemplateParams } from './Template'
import { allTemplates, createTemplate, getTemplate, updateTemplate } from './TemplateService'

const router = new Router<{
    app: App
    template?: Template
    user: { project_id: number }
}>({
    prefix: '/templates',
})

router.get('/', async ctx => {
    ctx.body = await allTemplates(ctx.state.user.project_id)
})

const templateParams: JSONSchemaType<TemplateParams> = {
    $id: 'templateParams',
    oneOf: [{
        type: 'object',
        required: ['name', 'project_id', 'type', 'data'],
        properties: {
            project_id: {
                type: 'integer',
            },
            name: {
                type: 'string',
            },
            type: {
                type: 'string',
                enum: ['email'],
            },
            data: {
                type: 'object',
                required: ['from', 'subject', 'text_body', 'html_body'],
                properties: {
                    from: { type: 'string' },
                    cc: {
                        type: 'string',
                        nullable: true,
                    },
                    bcc: {
                        type: 'string',
                        nullable: true,
                    },
                    reply_to: {
                        type: 'string',
                        nullable: true,
                    },
                    subject: { type: 'string' },
                    text_body: { type: 'string' },
                    html_body: { type: 'string' },
                },
            } as any,
        },
        additionalProperties: false,
    },
    {
        type: 'object',
        required: ['name', 'project_id', 'type', 'data'],
        properties: {
            project_id: {
                type: 'integer',
            },
            name: {
                type: 'string',
            },
            type: {
                type: 'string',
                enum: ['text'],
            },
            data: {
                type: 'object',
                required: ['from', 'text'],
                properties: {
                    from: { type: 'string' },
                    text: { type: 'string' },
                },
            } as any,
        },
        additionalProperties: false,
    },
    {
        type: 'object',
        required: ['name', 'project_id', 'type', 'data'],
        properties: {
            project_id: {
                type: 'integer',
            },
            name: {
                type: 'string',
            },
            type: {
                type: 'string',
                enum: ['push'],
            },
            data: {
                type: 'object',
                required: ['title', 'topic', 'body'],
                properties: {
                    title: { type: 'string' },
                    topic: { type: 'string' },
                    body: { type: 'string' },
                    custom: {
                        type: 'object',
                        nullable: true,
                        additionalProperties: true,
                    },
                },
            } as any,
        },
        additionalProperties: false,
    }],
}

router.post('/', async ctx => {
    const payload = validate(templateParams, ctx.request.body)
    ctx.body = await createTemplate(payload)
})

router.param('templateId', async (value, ctx, next) => {
    ctx.state.list = await getTemplate(parseInt(ctx.params.templateId), ctx.state.user.project_id)
    if (!ctx.state.template) {
        ctx.throw(404)
        return
    }
    return await next()
})

router.get('/:templateId', async ctx => {
    ctx.body = ctx.state.template
})

router.patch('/:templateId', async ctx => {
    const payload = validate(templateParams, ctx.request.body)
    ctx.body = await updateTemplate(ctx.state.template!.id, payload)
})

export default router
