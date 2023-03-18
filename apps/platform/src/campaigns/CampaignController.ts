import Router from '@koa/router'
import { JSONSchemaType, validate } from '../core/validate'
import Campaign, { CampaignCreateParams, CampaignUpdateParams } from './Campaign'
import { archiveCampaign, createCampaign, deleteCampaign, duplicateCampaign, getCampaign, getCampaignUsers, pagedCampaigns, updateCampaign } from './CampaignService'
import { searchParamsSchema } from '../core/searchParams'
import { extractQueryParams } from '../utilities'
import { ProjectState } from '../auth/AuthMiddleware'

const router = new Router<ProjectState & { campaign?: Campaign }>({
    prefix: '/campaigns',
})

router.get('/', async ctx => {
    const params = extractQueryParams(ctx.query, searchParamsSchema)
    ctx.body = await pagedCampaigns(params, ctx.state.project.id)
})

export const campaignCreateParams: JSONSchemaType<CampaignCreateParams> = {
    $id: 'campaignCreate',
    type: 'object',
    required: ['subscription_id', 'provider_id'],
    properties: {
        name: {
            type: 'string',
        },
        channel: {
            type: 'string',
            enum: ['email', 'text', 'push', 'webhook'],
        },
        subscription_id: {
            type: 'integer',
        },
        provider_id: {
            type: 'integer',
        },
        list_ids: {
            type: 'array',
            items: { type: 'integer' },
            nullable: true,
        },
        exclusion_list_ids: {
            type: 'array',
            items: { type: 'integer' },
            nullable: true,
        },
        send_in_user_timezone: {
            type: 'boolean',
            nullable: true,
        },
        send_at: {
            type: 'string',
            format: 'date-time',
            nullable: true,
        },
        tags: {
            type: 'array',
            items: {
                type: 'string',
            },
            nullable: true,
        },
    },
    additionalProperties: false,
}

router.post('/', async ctx => {
    const payload = validate(campaignCreateParams, ctx.request.body)
    ctx.body = await createCampaign(ctx.state.project.id, payload)
})

router.param('campaignId', async (value, ctx, next) => {
    ctx.state.campaign = await getCampaign(parseInt(value, 10), ctx.state.project.id)
    if (!ctx.state.campaign) {
        ctx.throw(404)
        return
    }
    return await next()
})

router.get('/:campaignId', async ctx => {
    ctx.body = ctx.state.campaign!
})

const campaignUpdateParams: JSONSchemaType<Partial<CampaignUpdateParams>> = {
    $id: 'campaignUpdate',
    type: 'object',
    properties: {
        name: {
            type: 'string',
            nullable: true,
        },
        subscription_id: {
            type: 'integer',
            nullable: true,
        },
        provider_id: {
            type: 'integer',
            nullable: true,
        },
        state: {
            type: 'string',
            enum: ['draft', 'scheduled', 'finished', 'aborted'],
            nullable: true,
        },
        list_ids: {
            type: 'array',
            items: { type: 'integer' },
            nullable: true,
        },
        exclusion_list_ids: {
            type: 'array',
            items: { type: 'integer' },
            nullable: true,
        },
        send_in_user_timezone: {
            type: 'boolean',
            nullable: true,
        },
        send_at: {
            type: 'string',
            format: 'date-time',
            nullable: true,
        },
        tags: {
            type: 'array',
            items: {
                type: 'string',
            },
            nullable: true,
        },
    },
    additionalProperties: false,
}

router.patch('/:campaignId', async ctx => {
    const payload = validate(campaignUpdateParams, ctx.request.body)
    ctx.body = await updateCampaign(ctx.state.campaign!.id, ctx.state.project.id, payload)
})

router.get('/:campaignId/users', async ctx => {
    const params = extractQueryParams(ctx.query, searchParamsSchema)
    ctx.body = await getCampaignUsers(ctx.state.campaign!.id, params, ctx.state.project.id)
})

router.delete('/:campaignId', async ctx => {
    const campaign = ctx.state.campaign!
    const { id, project_id, deleted_at } = campaign
    if (deleted_at) {
        ctx.body = await deleteCampaign(id, project_id)
    } else {
        ctx.body = await archiveCampaign(id, project_id)
    }
})

router.post('/:campaignId/duplicate', async ctx => {
    ctx.body = await duplicateCampaign(ctx.state.campaign!)
})

export default router
