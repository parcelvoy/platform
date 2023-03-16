import Router from '@koa/router'
import { ProjectState } from '../auth/AuthMiddleware'
import { searchParamsSchema } from '../core/searchParams'
import { extractQueryParams } from '../utilities'
import { loadAnalyticsControllers } from './analytics'
import { loadEmailControllers } from './email'
import { ProviderMeta } from './Provider'
import { allProviders, pagedProviders } from './ProviderService'
import { loadPushControllers } from './push'
import { loadTextControllers } from './text'
import { loadWebhookControllers } from './webhook'

const router = new Router<ProjectState>({
    prefix: '/providers',
})

const providers: ProviderMeta[] = []

loadTextControllers(router, providers)
loadEmailControllers(router, providers)
loadWebhookControllers(router, providers)
loadPushControllers(router, providers)
loadAnalyticsControllers(router, providers)

router.get('/', async ctx => {
    const params = extractQueryParams(ctx.query, searchParamsSchema)
    ctx.body = await pagedProviders(params, ctx.state.project.id)
})

router.get('/all', async ctx => {
    ctx.body = await allProviders(ctx.state.project.id)
})

router.get('/meta', async ctx => {
    ctx.body = providers
})

export default router
