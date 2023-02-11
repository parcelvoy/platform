import Router from '@koa/router'
import App from '../app'
import { getTokenCookies, revokeAccessToken } from './TokenRepository'

const router = new Router<{
    app: import('../app').default
        }>({
            prefix: '/auth',
        })

router.get('/login', async ctx => {
    await App.main.auth.start(ctx)
})

router.post('/login', async ctx => {
    await App.main.auth.start(ctx)
})

router.post('/login/callback', async ctx => {
    ctx.status = 204
    await App.main.auth.validate(ctx)
})

router.get('/login/callback', async ctx => {
    ctx.status = 204
    await App.main.auth.validate(ctx)
})

router.post('/logout', async ctx => {
    const oauth = getTokenCookies(ctx)
    if (oauth) {
        await revokeAccessToken(oauth.access_token, ctx)
    }
    ctx.body = {} // logout redirect env property?
})

router.get('/logout', async ctx => {
    const oauth = getTokenCookies(ctx)
    if (oauth) {
        await revokeAccessToken(oauth.access_token, ctx)
    }
    ctx.body = '<html><body>bye!</body></html>' // TODO redirect?
})

export default router
