import Router from '@koa/router'
import { ProjectState } from '../auth/AuthMiddleware'
import { searchParamsSchema } from '../core/searchParams'
import { decodeHashid, extractQueryParams } from '../utilities'
import { loadAnalyticsControllers } from './analytics'
import { loadEmailControllers } from './email'
import { ProviderMeta } from './Provider'
import { getProvider } from './ProviderRepository'
import { allProviders, pagedProviders } from './ProviderService'
import { loadPushControllers } from './push'
import { loadTextControllers } from './text'
import { loadWebhookControllers } from './webhook'

const adminRouter = new Router<ProjectState>({
    prefix: '/providers',
})

const publicRouter = new Router({
    prefix: '/providers/:hash',
})
publicRouter.param('hash', async (value, ctx, next) => {
    const providerId = decodeHashid(value)
    if (!providerId) {
        ctx.throw(404)
        return
    }

    ctx.state.provider = await getProvider(providerId)
    if (!ctx.state.provider) {
        ctx.throw(404)
        return
    }
    return await next()
})

const providers: ProviderMeta[] = []
const routers = { admin: adminRouter, public: publicRouter }
loadTextControllers(routers, providers)
loadEmailControllers(routers, providers)
loadWebhookControllers(routers, providers)
loadPushControllers(routers, providers)
loadAnalyticsControllers(routers, providers)

adminRouter.get('/', async ctx => {
    const params = extractQueryParams(ctx.query, searchParamsSchema)
    ctx.body = await pagedProviders(params, ctx.state.project.id)
})

adminRouter.get('/all', async ctx => {
    ctx.body = await allProviders(ctx.state.project.id)
})

adminRouter.get('/meta', async ctx => {
    ctx.body = providers
})

export { adminRouter, publicRouter }
