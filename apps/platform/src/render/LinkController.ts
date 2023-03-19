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

router.get('/.well-known/:file', async ctx => {
    const url = App.main.env.tracking.deeplinkMirrorUrl
    const file = ctx.params.file
    if (!url) {
        ctx.status = 404
        return
    }
    const response = await fetch(`${url}/.well-known/${file}`)
    ctx.body = await response.json()
})

export default router
