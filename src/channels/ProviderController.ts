import Router from '@koa/router'
import { loadEmailControllers } from './email'
import { loadPushControllers } from './push'
import { loadTextControllers } from './text'
import { loadWebhookControllers } from './webhook'

const router = new Router({
    prefix: '/providers',
})

loadTextControllers(router)
loadEmailControllers(router)
loadWebhookControllers(router)
loadPushControllers(router)

export default router
