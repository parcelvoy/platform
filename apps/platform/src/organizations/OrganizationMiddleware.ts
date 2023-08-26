import { Context } from 'koa'
import { getOrganization, getOrganizationByUsername } from './OrganizationService'

export const organizationMiddleware = async (ctx: Context, next: () => void) => {
    const organizationId = ctx.cookies.get('organization', { signed: true })
    if (organizationId) {
        ctx.state.organization = await getOrganization(parseInt(organizationId))
    } else if (ctx.subdomains && ctx.subdomains[0]) {
        const subdomain = ctx.subdomains[0]
        ctx.state.organization = await getOrganizationByUsername(subdomain)
    }
    return next()
}
