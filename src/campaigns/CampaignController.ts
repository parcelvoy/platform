import Router from '@koa/router'
import type App from '../app'
import { JSONSchemaType, validate } from '../core/validate'
import Campaign, { CampaignParams } from './Campaign'
import { createCampaign, getCampaign, sendList } from './CampaignService'

const router = new Router<{
    app: App
    campaign?: Campaign
}>({
    prefix: '/campaigns',
})

router.get('/', async ctx => {
    ctx.body = await Campaign.all()
})

export const campaignCreateParams: JSONSchemaType<CampaignParams> = {
    $id: 'campaignCreate',
    type: 'object',
    required: ['project_id', 'subscription_id', 'template_id'],
    properties: {
        project_id: {
            type: 'integer',
        },
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

    ctx.body = await createCampaign(payload)
})

router.param('campaignId', async (value, ctx, next) => {
    ctx.state.campaign = await getCampaign(parseInt(ctx.params.id))
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
        project_id: {
            type: 'integer',
            nullable: true,
        },
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

router.put('/:campaignId', async ctx => {
    const payload = validate(campaignUpdateParams, ctx.request.body)
    ctx.body = await Campaign.updateAndFetch(ctx.state.campaign!.id, payload)
})

router.post('/:campaignId/send', async ctx => {
    await sendList(ctx.state.campaign!)
})

export default router
