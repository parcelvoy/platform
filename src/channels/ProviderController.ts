import Router from '@koa/router'
import { ProjectState } from '../auth/AuthMiddleware'
import { loadEmailControllers } from './email'
import { ProviderMeta } from './Provider'
import { allProviders } from './ProviderService'
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

router.get('/', async ctx => {
    ctx.body = await allProviders(ctx.state.project.id)
})

router.get('/meta', async ctx => {
    ctx.body = providers
})

export default router
