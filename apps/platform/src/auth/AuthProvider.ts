import { Context } from 'koa'
import App from '../app'
import { RequestError } from '../core/errors'
import AuthError from './AuthError'
import { Admin, AdminParams } from './Admin'
import { createOrUpdateAdmin } from './AdminRepository'
import { generateAccessToken, OAuthResponse, setTokenCookies } from './TokenRepository'
import Organization from '../organizations/Organization'
import { State } from './AuthMiddleware'
import { createOrganization, getOrganizationByDomain } from '../organizations/OrganizationService'

type AuthState = State & { organization?: Organization }
export type AuthContext = Context & { state: AuthState }

export default abstract class AuthProvider {

    abstract start(ctx: AuthContext): Promise<void>
    abstract validate(ctx: AuthContext): Promise<void>

    async loadAuthOrganization(ctx: AuthContext, domain: string) {
        const organization = ctx.state.organization ?? await getOrganizationByDomain(domain)
        if (!organization) {
            return await createOrganization(domain)
        }
        return organization
    }

    async login(params: AdminParams, ctx?: AuthContext, redirect?: string): Promise<OAuthResponse> {

        // If existing, update otherwise create new admin based on params
        const admin = await createOrUpdateAdmin(params)

        if (!admin) throw new RequestError(AuthError.AdminNotFound)

        return this.generateOauth(admin, ctx, redirect)
    }

    private generateOauth(admin: Admin, ctx?: AuthContext, redirect?: string) {
        const oauth = generateAccessToken(admin, ctx)

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
