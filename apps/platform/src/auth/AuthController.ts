import Router from '@koa/router'
import { getTokenCookies, revokeAccessToken } from './TokenRepository'
import { Context } from 'koa'
import { getOrganization, getOrganizationByEmail, getOrganizationByUsername } from '../organizations/OrganizationService'
import Organization from '../organizations/Organization'
import { authMethods, checkAuth, startAuth, validateAuth } from './Auth'

const router = new Router<{
    organization?: Organization
}>({
    prefix: '/auth',
})

router.use(async (ctx: Context, next: () => void) => {
    const organizationId = ctx.cookies.get('organization')
    if (organizationId) {
        ctx.state.organization = await getOrganization(parseInt(organizationId))
    } else if (ctx.subdomains && ctx.subdomains[0]) {
        const subdomain = ctx.subdomains[0]
        ctx.state.organization = await getOrganizationByUsername(subdomain)
    }
    return next()
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
