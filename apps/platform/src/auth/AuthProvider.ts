import { Context } from 'koa'
import App from '../app'
import Admin, { AdminParams, AuthAdminParams } from './Admin'
import { getAdminByEmail } from './AdminRepository'
import { generateAccessToken, OAuthResponse, setTokenCookies } from './TokenRepository'
import Organization from '../organizations/Organization'
import { State } from './AuthMiddleware'
import { createOrganization, getDefaultOrganization, getOrganizationByDomain } from '../organizations/OrganizationService'

type OrgState = State & { organization?: Organization }
export type AuthContext = Context & { state: OrgState }

export default abstract class AuthProvider {

    abstract start(ctx: AuthContext): Promise<void>
    abstract validate(ctx: AuthContext): Promise<void>

    async loadAuthOrganization(ctx: AuthContext, domain?: string) {

        // If we have an organization or can find one by domain
        // we use that to start
        let organization = ctx.state.organization ?? await getOrganizationByDomain(domain)
        if (organization) return organization

        // If we are not in multi-org mode we always fall back to
        // a single organization
        if (!App.main.env.config.multiOrg) {
            organization = await getDefaultOrganization()
        }
        if (organization) return organization

        // If there is no organization at all or are in multi-org mode
        // and have no org for the user, create one
        return await createOrganization(domain)
    }

    async login(params: AuthAdminParams, ctx: AuthContext, redirect?: string): Promise<OAuthResponse> {

        // Check for existing, otherwise create one
        let admin = await getAdminByEmail(params.email)
        if (!admin) {
            const organization = await this.loadAuthOrganization(ctx, params.domain)
            admin = await Admin.insertAndFetch({
                ...params,
                organization_id: organization.id,
            })
        }

        return await this.generateOauth(admin, ctx, redirect)
    }

    private async generateOauth(admin: Admin, ctx?: AuthContext, redirect?: string) {
        const oauth = await generateAccessToken(admin, ctx)

        if (ctx) {
            setTokenCookies(ctx, oauth)
            ctx.redirect(redirect || App.main.env.baseUrl)
        }
        return oauth
    }

    async logout(params: Pick<AdminParams, 'email'>, ctx: AuthContext) {
        console.log(params, ctx)
        // not sure how we find the refresh token for a given session atm
        // revokeRefreshToken()
    }
}
