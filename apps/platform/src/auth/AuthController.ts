import Router from '@koa/router'
import { getTokenCookies, revokeAccessToken } from './TokenRepository'
import { getOrganizationByEmail } from '../organizations/OrganizationService'
import Organization from '../organizations/Organization'
import { authMethods, checkAuth, startAuth, validateAuth } from './Auth'

const router = new Router<{
    organization?: Organization
}>({
    prefix: '/auth',
})

router.get('/methods', async ctx => {
    ctx.body = await authMethods(ctx.state.organization)
})

router.post('/check', async ctx => {
    const email = ctx.query.email || ctx.request.body.email
    const organization = await getOrganizationByEmail(email)
    ctx.body = checkAuth(organization)
})

router.get('/login/:driver', async ctx => {
    ctx.status = 204
    await startAuth(ctx)
})

router.post('/login/:driver', async ctx => {
    ctx.status = 204
    await startAuth(ctx)
})

router.get('/login/:driver/callback', async ctx => {
    ctx.status = 204
    await validateAuth(ctx)
})

router.post('/login/:driver/callback', async ctx => {
    ctx.status = 204
    await validateAuth(ctx)
})

router.post('/logout', async ctx => {
    const oauth = getTokenCookies(ctx)
    if (oauth) {
        await revokeAccessToken(oauth.access_token, ctx)
    }
    ctx.redirect('/')
})

router.get('/logout', async ctx => {
    const oauth = getTokenCookies(ctx)
    if (oauth) {
        await revokeAccessToken(oauth.access_token, ctx)
    }
    ctx.redirect('/')
})

export default router
