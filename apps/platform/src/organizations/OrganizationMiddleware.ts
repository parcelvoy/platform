import { Context } from 'koa'
import { getOrganizationByUsername } from './OrganizationService'

export const organizationMiddleware = async (ctx: Context, next: () => void) => {
    if (ctx.subdomains && ctx.subdomains[0]) {
        const subdomain = ctx.subdomains[0]
        ctx.state.organization = await getOrganizationByUsername(subdomain)
    }
    return next()
}
