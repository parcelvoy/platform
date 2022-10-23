import Router from '@koa/router'
import App from '../app'
import { getCampaign } from '../campaigns/CampaignService'
import { loadTextChannelInbound } from '../channels/text'
import { RequestError } from '../core/errors'
import { JSONSchemaType, validate } from '../core/validate'
import { getUser } from '../users/UserRepository'
import Subscription, { SubscriptionParams } from './Subscription'
import { allSubscriptions, createSubscription, getSubscription, unsubscribe, unsubscribeSms } from './SubscriptionService'
import SubscriptionError from './SubscriptionError'
import { decodeHashid } from '../utilities'

/**
 ***
 * Public routes for webhooks & unsubscribe links
 ***
 */
const publicRouter = new Router<{app: App}>({
    prefix: '/unsubscribe',
})

interface EmailUnsubscribeParams {
    campaign_id: number
    user_id: number
}

export const emailUnsubscribeSchema: JSONSchemaType<EmailUnsubscribeParams> = {
    $id: 'emailUnsubscribe',
    type: 'object',
    required: ['campaign_id', 'user_id'],
    properties: {
        campaign_id: {
            type: 'integer',
        },
        user_id: {
            type: 'integer',
        },
    },
    additionalProperties: false,
}

publicRouter.post('/email/:userId/:campaignId', async ctx => {

    const params = {
        user_id: decodeHashid(ctx.params.userId),
        campaign_id: decodeHashid(ctx.params.campaignId),
    }
    const payload = validate(emailUnsubscribeSchema, params)

    const user = await getUser(payload.user_id)
    if (!user) throw new RequestError(SubscriptionError.UnsubscribeFailed)

    const campaign = await getCampaign(payload.campaign_id, user.project_id)
    if (!campaign) throw new RequestError(SubscriptionError.UnsubscribeFailed)

    await unsubscribe(user.id, campaign?.subscription_id)

    ctx.status = 204
})

publicRouter.post('/sms', async ctx => {

    // Always return with positive status code
    ctx.status = 204

    // Match up to provider based on inbound number
    const to = ctx.request.body.To || ctx.request.body.to
    const channel = await loadTextChannelInbound(to)
    if (!channel) return

    await unsubscribeSms(channel.provider, ctx.request.body)
})

export { publicRouter }

/**
 ***
 * Client router for things like push which will come direct from
 * our client side libraries
 ***
 */
const clientRouter = new Router<{app: App}>({
    prefix: '/unsubscribe',
})
clientRouter.post('/push', async ctx => {
    // TODO: Unsubscribe for push types
    // Since this is coming from a client it should probably
    // contain a token and may not belong here. How to
    // structure project for client endpoints is tricky

    ctx.status = 204
})
export { clientRouter }

/**
 ***
 * Private admin routes for managing subscription types
 ***
 */
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
