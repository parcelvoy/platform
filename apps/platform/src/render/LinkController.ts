import Router from '@koa/router'
import App from '../app'
import { encodedLinkToParts, trackLinkEvent } from './LinkService'

const router = new Router<{app: App}>()

router.get('/c', async ctx => {
    const parts = await encodedLinkToParts(ctx.URL)
    await trackLinkEvent(parts, 'clicked')
    ctx.redirect(parts.redirect)
})

router.get('/o', async ctx => {
    const parts = await encodedLinkToParts(ctx.URL)
    await trackLinkEvent(parts, 'opened')
    ctx.status = 204
})

export default router
