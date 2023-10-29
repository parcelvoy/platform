import Router from '@koa/router'
import { createClientSchema } from './client'
import App from '../app'

const router = new Router({
    prefix: '/openapi',
})

router.get('/client', async ctx => {
    ctx.body = createClientSchema(App.main)
})

export default router
