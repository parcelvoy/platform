import { Context } from 'koa'
import { AuthTypeConfig } from './Auth'
import AuthProvider from './AuthProvider'
import App from '../app'
import { combineURLs, firstQueryParam } from '../utilities'
import { RequestError } from '../core/errors'
import AuthError from './AuthError'
import { sign } from 'jsonwebtoken'
import { addSeconds } from 'date-fns'
import SMTPEmailProvider, { SMTPDataParams } from '../providers/email/SMPTEmailProvider'
import { verify } from './AuthMiddleware'

export interface EmailAuthConfig extends AuthTypeConfig, SMTPDataParams {
    driver: 'email'
    from: string
}

export default class EmailAuthProvider extends AuthProvider {

    private config: EmailAuthConfig
    private provider: SMTPEmailProvider
    constructor(config: EmailAuthConfig) {
        super()
        this.config = config
        this.provider = SMTPEmailProvider.fromJson(config)
        this.provider.boot()
    }

    async start(ctx: Context) {

        const redirect = firstQueryParam(ctx.request.query.r)
        const email = ctx.request.body.email

        if (email) {

            // Fifteen minute expiration
            const expiresAt = addSeconds(Date.now(), 15 * 60)
            const token = sign({
                email,
                exp: Math.floor(expiresAt.getTime() / 1000),
            }, App.main.env.secret)
            const link = `${combineURLs([App.main.env.apiBaseUrl, '/auth/login/email/callback'])}?token=${token}&r=${redirect}`
            await this.provider.send({
                to: email,
                from: this.config.from,
                subject: 'Login to Parcelvoy',
                html: `
                    <p>Click the link below to login to Parcelvoy</p>
                    <a href="${link}">Login</a>
                `,
                text: `Click the link below to login to Parcelvoy: ${link}`,
            })
        } else {
            ctx.redirect(combineURLs([App.main.env.apiBaseUrl, '/login/email']) + '?r=' + redirect)
        }
    }

    async validate(ctx: Context) {
        const token = firstQueryParam(ctx.request.query.token)
        if (!token) throw new RequestError(AuthError.MissingCredentials)

        const { email } = await verify(token) as { email: string }
        await this.login({
            email,
            first_name: 'Admin',
        }, ctx)
    }
}
