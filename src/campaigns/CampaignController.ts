import Router from '@koa/router'
import { JSONSchemaType, validate } from '../core/validate'
import Campaign, { CampaignParams } from './Campaign'
import { createCampaign, getCampaign, pagedCampaigns, sendList, updateCampaign } from './CampaignService'
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

export const campaignCreateParams: JSONSchemaType<CampaignParams> = {
    $id: 'campaignCreate',
    type: 'object',
    required: ['subscription_id', 'template_id'],
    properties: {
        name: {
            type: 'string',
        },
        list_id: {
            type: 'integer',
            nullable: true,
        },
        subscription_id: {
            type: 'integer',
        },
        template_id: {
            type: 'integer',
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
    ctx.body = ctx.state.campaign
})

const campaignUpdateParams: JSONSchemaType<Partial<CampaignParams>> = {
    $id: 'campaignUpdate',
    type: 'object',
    properties: {
        name: {
            type: 'string',
            nullable: true,
        },
        list_id: {
            type: 'integer',
            nullable: true,
        },
        subscription_id: {
            type: 'integer',
            nullable: true,
        },
        template_id: {
            type: 'integer',
            nullable: true,
        },
    },
    additionalProperties: false,
}

router.patch('/:campaignId', async ctx => {
    const payload = validate(campaignUpdateParams, ctx.request.body)
    ctx.body = await updateCampaign(ctx.state.campaign!.id, payload)
})

router.post('/:campaignId/send', async ctx => {
    await sendList(ctx.state.campaign!)
    ctx.status = 202
})

export default router
