import Router from '@koa/router'
import Project from '../projects/Project'
import type App from '../app'
import { JSONSchemaType, validate } from '../core/validate'
import Campaign, { CampaignParams } from './Campaign'
import { sendList } from './CampaignService'
import List from '../lists/List'

const router = new Router<{
    app: App
    project?: Project
}>({
    prefix: '/campaigns',
})

export const campaignCreateParams: JSONSchemaType<CampaignParams> = {
    $id: 'campaign',
    type: 'object',
    required: ['project_id', 'channel', 'template_id'],
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
        channel: {
            type: 'string',
        },
        template_id: {
            type: 'number',
        },
    },
    additionalProperties: false,
}

router.post('/', async ctx => {
    const payload = validate(campaignCreateParams, ctx.request.body)

    const campaign = await Campaign.insertAndFetch(payload)
    const list = await List.find(1)

    await sendList(campaign, list!)
})

export default router
