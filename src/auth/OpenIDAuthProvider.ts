import { addSeconds } from 'date-fns'
import { Context } from 'koa'
import { Issuer, generators, BaseClient, IdTokenClaims } from 'openid-client'
import { RequestError } from '../core/errors'
import AuthError from './AuthError'
import { AuthTypeConfig } from './Auth'
import AuthProvider from './AuthProvider'

export interface OpenIDConfig extends AuthTypeConfig {
    driver: 'openid'
    issuerUrl: string // 'https://accounts.google.com'
    clientId: string
    cliendSecret: string
    redirectUri: string
    domainWhitelist: string[]
}

export default class OpenIDAuthProvider extends AuthProvider {

    private config: OpenIDConfig
    private client!: BaseClient
    constructor(config: OpenIDConfig) {
        super()
        this.config = config

        this.getClient()
    }

    async start(ctx: Context): Promise<void> {

        const client = await this.getClient()

        const nonce = generators.nonce()
        // store the nonce in your framework's session mechanism, if it is a cookie based solution
        // it should be httpOnly (not readable by javascript) and encrypted.

        ctx.cookies.set('nonce', nonce, {
            secure: process.env.NODE_ENV !== 'development',
            httpOnly: true,
            expires: addSeconds(Date.now(), 3600),
        })

        const url = client.authorizationUrl({
            scope: 'openid email profile',
            response_mode: 'form_post',
            nonce,
        })

        ctx.redirect(url)
    }

    async validate(ctx: Context): Promise<void> {
        const client = await this.getClient()
        const nonce = ctx.cookies.get('nonce')

        // Unsafe cast, but Koa and library don't play nicely
        const params = client.callbackParams(ctx.request as any)

        const tokenSet = await client.callback(this.config.redirectUri, params, { nonce })

        const claims = tokenSet.claims()

        if (this.isDomainWhitelisted(claims)) {
            throw new RequestError(AuthError.InvalidDomain)
        }

        if (!claims.email) {
            throw new RequestError(AuthError.InvalidEmail)
        }

        const admin = {
            email: claims.email,
            first_name: claims.given_name ?? claims.name,
            last_name: claims.family_name,
        }

        await this.login(admin, ctx)
    }

    private async getClient(): Promise<BaseClient> {
        if (this.client) return this.client

        const issuer = await Issuer.discover(this.config.issuerUrl)

        // TODO: Should we validate that we can use the issuer?
        this.client = new issuer.Client({
            client_id: this.config.clientId,
            client_secret: this.config.cliendSecret,
            redirect_uris: [this.config.redirectUri],
            response_types: ['id_token'],
        })
        return this.client
    }

    private isDomainWhitelisted(claims: IdTokenClaims): boolean {
        if (claims.hd && typeof claims.hd === 'string') {
            return this.config.domainWhitelist.includes(claims.hd)
        }
        return this.config.domainWhitelist.find(
            domain => claims.email?.endsWith(domain),
        ) !== undefined
    }
}
