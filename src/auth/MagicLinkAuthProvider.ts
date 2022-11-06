import { Context } from 'koa'
import { verify } from 'jsonwebtoken'
import { AuthTypeConfig } from './Auth'
import { getAdminByEmail } from './AdminRepository'
import AuthProvider from './AuthProvider'
import { generateAccessToken } from './TokenRepository'
import App from '../app'
import { combineURLs } from '../utilities'

export interface MagicLinkConfig extends AuthTypeConfig {
    driver: 'magic'
}

export default class MagicLinkAuthProvider extends AuthProvider {

    constructor(config: MagicLinkConfig) {
        super()
    }

    async start(ctx: Context) {
        const { email } = ctx.request.body
        if (!email) throw new Error()

        // Find admin, otherwise silently break
        const admin = await getAdminByEmail(email)
        if (!admin) return

        const jwt = generateAccessToken(admin.id)
        // TODO: Figure out how to get an email provider to send

        // ctx.redirect(url)
    }

    async validate(ctx: Context) {

        const { jwt } = ctx.request.body

        // Verify that the token is authentic and get the ID
        const { id } = verify(jwt, App.main.env.secret) as { id: number }

        // With the ID, process a new login
        await this.login(id, ctx)
    }

    static callbackUrl(token: string): string {
        const baseUrl = combineURLs([App.main.env.baseUrl, 'auth/login'])
        const url = new URL(baseUrl)
        url.searchParams.set('token', token)
        return url.href
    }
}
