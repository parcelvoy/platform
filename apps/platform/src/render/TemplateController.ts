import Router from '@koa/router'
import { ProjectState } from '../auth/AuthMiddleware'
import { JSONSchemaType, validate } from '../core/validate'
import { searchParamsSchema } from '../core/searchParams'
import { extractQueryParams } from '../utilities'
import Template, { TemplateParams, TemplateUpdateParams } from './Template'
import { createTemplate, deleteTemplate, getTemplate, pagedTemplates, sendProof, updateTemplate } from './TemplateService'
import { Variables } from '.'
import { User } from '../users/User'
import { UserEvent } from '../users/UserEvent'

const router = new Router<
    ProjectState & { template?: Template }
>({
    prefix: '/templates',
})

router.get('/', async ctx => {
    const params = extractQueryParams(ctx.query, searchParamsSchema)
    ctx.body = await pagedTemplates(params, ctx.state.project.id)
})

const templateDataEmailParams = {
    type: 'object',
    properties: {
        from: {
            type: 'object',
            nullable: true,
            properties: {
                name: {
                    type: 'string',
                    nullable: true,
                },
                address: {
                    type: 'string',
                    nullable: true,
                },
            },
        },
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
        subject: {
            type: 'string',
            nullable: true,
        },
        text: {
            type: 'string',
            nullable: true,
        },
        html: {
            type: 'string',
            nullable: true,
        },
        mjml: {
            type: 'string',
            nullable: true,
        },
    },
    nullable: true,
}

const templateDataTextParams = {
    type: 'object',
    properties: {
        text: {
            type: 'string',
            nullable: true,
        },
    },
    nullable: true,
}

const templateDataPushParams = {
    type: 'object',
    required: ['title', 'body'],
    properties: {
        title: { type: 'string' },
        body: { type: 'string' },
        custom: {
            type: 'object',
            nullable: true,
            additionalProperties: true,
        },
    },
    nullable: true,
}

const templateDataWebhookParams = {
    type: 'object',
    required: ['method', 'endpoint'],
    properties: {
        method: { type: 'string' },
        endpoint: { type: 'string' },
        body: {
            type: 'object',
            nullable: true,
            additionalProperties: true,
        },
        headers: {
            type: 'object',
            nullable: true,
            additionalProperties: true,
        },
    },
    nullable: true,
}

const templateCreateParams: JSONSchemaType<TemplateParams> = {
    $id: 'templateCreateParams',
    oneOf: [{
        type: 'object',
        required: ['type', 'campaign_id', 'locale'],
        properties: {
            type: {
                type: 'string',
                enum: ['email'],
            },
            campaign_id: {
                type: 'integer',
            },
            locale: {
                type: 'string',
            },
            data: templateDataEmailParams as any,
        },
        additionalProperties: false,
    },
    {
        type: 'object',
        required: ['type', 'campaign_id', 'locale'],
        properties: {
            type: {
                type: 'string',
                enum: ['text'],
            },
            campaign_id: {
                type: 'integer',
            },
            locale: {
                type: 'string',
            },
            data: templateDataTextParams as any,
        },
        additionalProperties: false,
    },
    {
        type: 'object',
        required: ['type', 'campaign_id', 'locale'],
        properties: {
            type: {
                type: 'string',
                enum: ['push'],
            },
            campaign_id: {
                type: 'integer',
            },
            locale: {
                type: 'string',
            },
            data: templateDataPushParams as any,
        },
        additionalProperties: false,
    },
    {
        type: 'object',
        required: ['type', 'campaign_id', 'locale'],
        properties: {
            type: {
                type: 'string',
                enum: ['webhook'],
            },
            campaign_id: {
                type: 'integer',
            },
            locale: {
                type: 'string',
            },
            data: templateDataWebhookParams as any,
        },
        additionalProperties: false,
    }],
}
router.post('/', async ctx => {
    const payload = validate(templateCreateParams, ctx.request.body)
    ctx.body = await createTemplate(ctx.state.project.id, payload)
})

router.param('templateId', async (value, ctx, next) => {
    ctx.state.template = await getTemplate(parseInt(value), ctx.state.project.id)
    if (!ctx.state.template) {
        ctx.throw(404)
        return
    }
    return await next()
})

router.get('/:templateId', async ctx => {
    ctx.body = ctx.state.template
})

const templateUpdateParams: JSONSchemaType<TemplateUpdateParams> = {
    $id: 'templateUpdateParams',
    oneOf: [{
        type: 'object',
        required: ['type', 'data'],
        properties: {
            type: {
                type: 'string',
                enum: ['email'],
            },
            data: templateDataEmailParams as any,
        },
        additionalProperties: false,
    },
    {
        type: 'object',
        required: ['type', 'data'],
        properties: {
            type: {
                type: 'string',
                enum: ['text'],
            },
            data: templateDataTextParams as any,
        },
        additionalProperties: false,
    },
    {
        type: 'object',
        required: ['type', 'data'],
        properties: {
            type: {
                type: 'string',
                enum: ['push'],
            },
            data: templateDataPushParams as any,
        },
        additionalProperties: false,
    },
    {
        type: 'object',
        required: ['type', 'data'],
        properties: {
            type: {
                type: 'string',
                enum: ['webhook'],
            },
            data: templateDataWebhookParams as any,
        },
        additionalProperties: false,
    }],
}
router.patch('/:templateId', async ctx => {
    const payload = validate(templateUpdateParams, ctx.request.body)
    ctx.body = await updateTemplate(ctx.state.template!.id, payload)
})

router.delete('/:templateId', async ctx => {
    const template = ctx.state.template!
    ctx.body = await deleteTemplate(template.id, template.project_id)
})

router.post('/:templateId/preview', async ctx => {
    const payload = ctx.request.body as Variables
    const template = ctx.state.template!.map()

    ctx.body = template.compile({
        user: User.fromJson({ ...payload.user, data: payload.user }),
        event: UserEvent.fromJson(payload.event || {}),
        context: payload.context || {},
        project: ctx.state.project,
    })
})

interface TemplateProofParams {
    variables: any
    recipient: string
}

const templateProofParams: JSONSchemaType<TemplateProofParams> = {
    $id: 'templateProof',
    type: 'object',
    required: ['recipient'],
    properties: {
        variables: {
            type: 'object',
            nullable: true,
            additionalProperties: true,
        },
        recipient: { type: 'string' },
    },
    additionalProperties: false,
}
router.post('/:templateId/proof', async ctx => {
    const { variables, recipient } = validate(templateProofParams, ctx.request.body)
    const template = ctx.state.template!.map()

    ctx.body = await sendProof(template, variables, recipient)
})

export default router
