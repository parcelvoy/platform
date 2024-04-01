import { Context } from 'koa'
import { AuthTypeConfig } from './Auth'
import AuthProvider from './AuthProvider'
import App from '../app'
import { combineURLs, firstQueryParam } from '../utilities'
import { RequestError } from '../core/errors'
import AuthError from './AuthError'

export interface BasicAuthConfig extends AuthTypeConfig {
    driver: 'basic'
    email: string
    password: string
}

export default class BasicAuthProvider extends AuthProvider {

    private config: BasicAuthConfig
    constructor(config: BasicAuthConfig) {
        super()
        this.config = config
    }

    async start(ctx: Context) {

        const redirect = firstQueryParam(ctx.request.query.r)

        // Redirect to the login form
        ctx.redirect(combineURLs([App.main.env.baseUrl, '/login/basic']) + '?r=' + redirect)
    }

    async validate(ctx: Context) {

        const { email, password } = ctx.request.body
        if (!email || !password) throw new RequestError(AuthError.MissingCredentials)

        // Check email and password match
        if (email !== this.config.email || password !== this.config.password) {
            throw new RequestError(AuthError.InvalidCredentials)
        }

        // Process the login
        await this.login({ email, first_name: 'Admin', domain: 'local' }, ctx)
    }
}
