import Router from '@koa/router'
import type App from '../app'
import { JSONSchemaType, validate } from '../core/validate'
import Subscription, { SubscriptionParams } from './Subscription'
import { allSubscriptions, createSubscription, getSubscription } from './SubscriptionService'

const router = new Router<{
    app: App
    subscription?: Subscription
    user: { project_id: number }
}>({
    prefix: '/subscriptions',
})

router.get('/', async ctx => {
    ctx.body = await allSubscriptions(ctx.state.user.project_id)
})

export const subscriptionCreateSchema: JSONSchemaType<SubscriptionParams> = {
    $id: 'subscriptionCreate',
    type: 'object',
    required: ['project_id', 'name', 'channel'],
    properties: {
        project_id: {
            type: 'integer',
        },
        name: {
            type: 'string',
        },
        channel: {
            type: 'string',
            enum: ['email', 'text', 'webhook'],
        },
    },
    additionalProperties: false,
}

router.post('/', async ctx => {
    const payload = validate(subscriptionCreateSchema, ctx.request.body)
    ctx.body = await createSubscription(payload)
})

router.param('subscriptionId', async (value, ctx, next) => {
    ctx.state.subscription = await getSubscription(parseInt(ctx.params.subscriptionId), ctx.state.user.project_id)
    if (!ctx.state.campaign) {
        ctx.throw(404)
        return
    }
    return await next()
})

router.get('/:subscriptionId', async ctx => {
    ctx.body = ctx.state.subscription
})

export default router
