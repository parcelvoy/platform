import Router from '@koa/router'
import { ProjectState } from '../auth/AuthMiddleware'
import { searchParamsSchema } from '../core/searchParams'
import { decodeHashid, extractQueryParams } from '../utilities'
import { analyticsProviders } from './analytics'
import { emailProviders } from './email'
import Provider from './Provider'
import { getProvider } from './ProviderRepository'
import { allProviders, archiveProvider, loadController, pagedProviders } from './ProviderService'
import { pushProviders } from './push'
import { textProviders } from './text'
import { webhookProviders } from './webhook'

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

const providers: (typeof Provider)[] = [
    ...textProviders,
    ...emailProviders,
    ...pushProviders,
    ...webhookProviders,
    ...analyticsProviders,
]

const routers = { admin: adminRouter, public: publicRouter }
for (const provider of providers) {
    loadController(routers, provider)
}

export const addProvider = (typeMap: Record<string, any>, provider: typeof Provider) => {
    if (!typeMap[provider.namespace]) {
        typeMap[provider.namespace] = provider
    }
    providers.push(provider)
    loadController(routers, provider)
}

adminRouter.get('/', async ctx => {
    const params = extractQueryParams(ctx.query, searchParamsSchema)
    ctx.body = await pagedProviders(params, ctx.state.project.id)
})

adminRouter.get('/all', async ctx => {
    ctx.body = await allProviders(ctx.state.project.id)
})

adminRouter.get('/meta', async ctx => {
    ctx.body = providers
        .filter(provider => provider.options.filter?.(ctx) ?? true)
        .map(provider => ({
            ...provider.meta,
            group: provider.group,
            type: provider.namespace,
            schema: provider.schema,
        }))
})

adminRouter.delete('/:id', async ctx => {
    ctx.body = await archiveProvider(parseInt(ctx.params.id), ctx.state.project.id)
})

export { adminRouter, publicRouter, providers }
