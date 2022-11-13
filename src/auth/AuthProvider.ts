import { Context } from 'koa'
import App from '../app'
import { RequestError } from '../core/errors'
import AuthError from './AuthError'
import { AdminParams } from './Admin'
import { createOrUpdateAdmin, getAdmin } from './AdminRepository'
import { generateAccessToken, generateRefreshToken, getOauth, OAuthResponse, setTokenCookies } from './TokenRepository'

export default abstract class AuthProvider {

    abstract start(ctx: Context): Promise<void>
    abstract validate(ctx: Context): Promise<void>

    async login(id: number, ctx?: Context): Promise<OAuthResponse>
    async login(params: AdminParams, ctx?: Context): Promise<OAuthResponse>
    async login(params: AdminParams | number, ctx?: Context): Promise<OAuthResponse> {

        // If existing, update otherwise create new admin based on params
        const admin = typeof params === 'number'
            ? await getAdmin(params)
            : await createOrUpdateAdmin(params)

        if (!admin) throw new RequestError(AuthError.AdminNotFound)

        const refreshToken = await generateRefreshToken(admin.id)
        const accessToken = generateAccessToken(admin.id)

        const oauth = getOauth(refreshToken, accessToken)

        if (ctx) {
            setTokenCookies(ctx, oauth)
            ctx.redirect(App.main.env.baseUrl)
        }
        return oauth
    }

    async logout(params: AdminParams, ctx: Context) {
        console.log(params, ctx)
        // not sure how we find the refresh token for a given session atm
        // revokeRefreshToken()
    }
}
