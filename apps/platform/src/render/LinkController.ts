import Router from '@koa/router'
import App from '../app'
import { encodedLinkToParts, trackMessageEvent } from './LinkService'
import Organization from '../organizations/Organization'

const router = new Router<{
    app: App
    organization?: Organization
}>()

router.get('/c', async ctx => {

    // If no redirect, just show a default page
    if (!ctx.query.r) {
        ctx.body = 'It looks like this link doesn\'t work properly!'
        ctx.status = 200
        return
    }

    const parts = await encodedLinkToParts(ctx.URL)
    await trackMessageEvent(parts, 'clicked')
    ctx.redirect(parts.redirect)
    ctx.status = 303
})

router.get('/o', async ctx => {
    const parts = await encodedLinkToParts(ctx.URL)
    await trackMessageEvent(parts, 'opened')
    ctx.status = 204
})

router.get('/.well-known/:file', async ctx => {
    const url = ctx.state.organization?.tracking_deeplink_mirror_url
    const file = ctx.params.file
    if (!url) {
        ctx.status = 404
        return
    }
    const response = await fetch(`${url}/.well-known/${file}`)
    ctx.body = await response.json()
})

export default router
