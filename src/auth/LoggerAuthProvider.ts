import { Context } from 'koa'
import { verify } from 'jsonwebtoken'
import { AuthTypeConfig } from './Auth'
import { getAdminByEmail } from './AdminRepository'
import AuthProvider from './AuthProvider'
import { generateAccessToken } from './TokenRepository'
import App from '../app'
import { logger } from '../config/logger'
import { combineURLs } from '../utilities'

export interface LoggerAuthConfig extends AuthTypeConfig {
    driver: 'logger'
}

export default class LoggerAuthProvider extends AuthProvider {

    async start(ctx: Context) {
        console.log('body', ctx.request.body)
        const { email } = ctx.request.body
        if (!email) throw new Error()

        // Find admin, otherwise silently break
        const admin = await getAdminByEmail(email)
        if (!admin) return

        const jwt = generateAccessToken(admin.id)
        const url = this.callbackUrl(jwt.token)

        logger.info({ url }, 'login link')
        ctx.redirect(url)
    }

    async validate(ctx: Context) {

        const jwt = ctx.query.token as string

        // Verify that the token is authentic and get the ID
        const { id } = verify(jwt, App.main.env.secret) as { id: number }

        // With the ID, process a new login
        const oauth = await this.login(id, ctx)
        logger.info(oauth, 'login credentials')
    }

    callbackUrl(token: string): string {
        const baseUrl = combineURLs([App.main.env.baseUrl, 'auth/login'])
        const url = new URL(baseUrl)
        url.searchParams.set('token', token)
        return url.href
    }
}
