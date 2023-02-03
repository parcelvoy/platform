import Router from '@koa/router'
import { ProjectState } from '../auth/AuthMiddleware'
import { loadEmailControllers } from './email'
import { allProviders } from './ProviderService'
import { loadPushControllers } from './push'
import { loadTextControllers } from './text'
import { loadWebhookControllers } from './webhook'

const router = new Router<ProjectState>({
    prefix: '/providers',
})

loadTextControllers(router)
loadEmailControllers(router)
loadWebhookControllers(router)
loadPushControllers(router)

router.get('/', async ctx => {
    ctx.body = await allProviders(ctx.state.project.id)
})

export default router
