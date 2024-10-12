import { Context } from 'koa'
import { getDefaultOrganization, getOrganization, getOrganizationByUsername } from './OrganizationService'
import App from '../app'

export const organizationMiddleware = async (ctx: Context, next: () => void) => {
    const organizationId = ctx.cookies.get('organization', { signed: true })
    if (!App.main.env.config.multiOrg) {
        ctx.state.organization = await getDefaultOrganization()
    } else if (organizationId) {
        ctx.state.organization = await getOrganization(parseInt(organizationId))
    } else if (ctx.subdomains && ctx.subdomains[0]) {
        const subdomain = ctx.subdomains[0]
        ctx.state.organization = await getOrganizationByUsername(subdomain)
    }
    return next()
}
