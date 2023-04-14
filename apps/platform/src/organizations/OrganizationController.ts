import Router from '@koa/router'
import App from '../app'

const router = new Router({
    prefix: '/organizations',
})

router.get('/metrics', async ctx => {
    ctx.body = await App.main.queue.metrics()
})

export default router
