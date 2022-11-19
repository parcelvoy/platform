import { Context } from 'koa'
import App from '../app'
import { RequestError } from '../core/errors'
import AuthError from './AuthError'
import { AdminParams } from './Admin'
import { createOrUpdateAdmin, getAdmin } from './AdminRepository'
import { generateAccessToken, OAuthResponse, setTokenCookies } from './TokenRepository'

export default abstract class AuthProvider {

    abstract start(ctx: Context): Promise<void>
    abstract validate(ctx: Context): Promise<void>

    async login(id: number, ctx?: Context, redirect?: string): Promise<OAuthResponse>
    async login(params: AdminParams, ctx?: Context, redirect?: string): Promise<OAuthResponse>
    async login(params: AdminParams | number, ctx?: Context, redirect?: string): Promise<OAuthResponse> {

        // If existing, update otherwise create new admin based on params
        const admin = typeof params === 'number'
            ? await getAdmin(params)
            : await createOrUpdateAdmin(params)

        if (!admin) throw new RequestError(AuthError.AdminNotFound)

        const oauth = generateAccessToken(admin)

        if (ctx) {
            setTokenCookies(ctx, oauth)
            ctx.redirect(redirect || App.main.env.baseUrl)
        }
        return oauth
    }

    async logout(params: AdminParams, ctx: Context) {
        console.log(params, ctx)
        // not sure how we find the refresh token for a given session atm
        // revokeRefreshToken()
    }
}
