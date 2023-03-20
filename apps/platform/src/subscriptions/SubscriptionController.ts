import Router from '@koa/router'
import App from '../app'
import { loadTextChannelInbound } from '../providers/text'
import { RequestError } from '../core/errors'
import { JSONSchemaType, validate } from '../core/validate'
import Subscription, { SubscriptionParams } from './Subscription'
import { createSubscription, getSubscription, pagedSubscriptions, unsubscribe, unsubscribeSms } from './SubscriptionService'
import SubscriptionError from './SubscriptionError'
import { encodedLinkToParts } from '../render/LinkService'
import { ProjectState } from '../auth/AuthMiddleware'
import { extractQueryParams } from '../utilities'
import { searchParamsSchema } from '../core/searchParams'
import { projectRoleMiddleware } from '../projects/ProjectService'

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

publicRouter.post('/email', async ctx => {

    const { user, campaign } = await encodedLinkToParts(ctx.URL)

    if (!user || !campaign) throw new RequestError(SubscriptionError.UnsubscribeFailed)

    await unsubscribe(user.id, campaign.subscription_id)

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
const router = new Router<
    ProjectState & { subscription?: Subscription }
>({
    prefix: '/subscriptions',
})

router.get('/', async ctx => {
    const params = extractQueryParams(ctx.query, searchParamsSchema)
    ctx.body = await pagedSubscriptions(params, ctx.state.project.id)
})

export const subscriptionCreateSchema: JSONSchemaType<SubscriptionParams> = {
    $id: 'subscriptionCreate',
    type: 'object',
    required: ['name', 'channel'],
    properties: {
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

router.post('/', projectRoleMiddleware('admin'), async ctx => {
    const payload = validate(subscriptionCreateSchema, ctx.request.body)
    ctx.body = await createSubscription(ctx.state.project.id, payload)
})

router.param('subscriptionId', async (value, ctx, next) => {
    ctx.state.subscription = await getSubscription(parseInt(value), ctx.state.project.id)
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
