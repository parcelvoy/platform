import { Context } from 'koa'
import { AuthTypeConfig } from './Auth'
import { getAdminByEmail } from './AdminRepository'
import AuthProvider from './AuthProvider'
import App from '../app'
import { combineURLs, firstQueryParam } from '../utilities'
import { Admin } from './Admin'
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
        if (!email || !password) throw new RequestError(AuthError.InvalidCredentials)

        // Check email and password match
        if (email !== this.config.email || password !== this.config.password) {
            throw new RequestError(AuthError.InvalidCredentials)
        }

        // Find admin, otherwise first time, create
        let admin = await getAdminByEmail(email)
        if (!admin) {
            admin = await Admin.insertAndFetch({ email, first_name: 'Admin' })
        }

        // Get the only org that can exist for this method of login
        const { id } = await this.loadAuthOrganization(ctx, 'local')

        // Process the login
        await this.login({ email, organization_id: id }, ctx)
    }
}
