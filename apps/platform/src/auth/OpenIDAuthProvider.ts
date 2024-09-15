import { addSeconds } from 'date-fns'
import { Issuer, generators, BaseClient, IdTokenClaims } from 'openid-client'
import { RequestError } from '../core/errors'
import AuthError from './AuthError'
import { AuthTypeConfig } from './Auth'
import AuthProvider, { AuthContext } from './AuthProvider'
import { firstQueryParam } from '../utilities'
import App from '../app'

export interface OpenIDConfig extends AuthTypeConfig {
    driver: 'openid'
    issuerUrl: string
    clientId: string
    clientSecret: string
    redirectUri: string
    domain?: string
    responseTypes: string[]
}

export default class OpenIDAuthProvider extends AuthProvider {

    private config: OpenIDConfig
    private client!: BaseClient
    constructor(config: OpenIDConfig) {
        super()
        this.config = config

        this.getClient()
    }

    async start(ctx: AuthContext): Promise<void> {

        const client = await this.getClient()

        const nonce = generators.nonce()
        ctx.cookies.set('nonce', nonce, {
            secure: ctx.request.secure,
            httpOnly: true,
            expires: addSeconds(Date.now(), 3600),
            signed: true,
        })

        const state = firstQueryParam(ctx.request.query.r)

        ctx.cookies.set('relaystate', state, {
            secure: ctx.request.secure,
            httpOnly: true,
            expires: addSeconds(Date.now(), 3600),
            signed: true,
        })

        const organization = ctx.state.organization
        if (organization) {
            ctx.cookies.set('organization', `${organization.id}`, {
                secure: ctx.request.secure,
                httpOnly: true,
                expires: addSeconds(Date.now(), 3600),
                signed: true,
            })
        }

        const url = client.authorizationUrl({
            scope: 'openid email profile',
            response_mode: 'form_post',
            nonce,
            redirect_uri: this.config.redirectUri,
            state,
        })

        ctx.redirect(url)
    }

    async validate(ctx: AuthContext): Promise<void> {
        const client = await this.getClient()

        // Unsafe cast, but Koa and library don't play nicely
        const params = client.callbackParams(ctx.request as any)
        const nonce = ctx.cookies.get('nonce', { signed: true })
        const state = params.state ?? ctx.cookies.get('relaystate', { signed: true })

        try {
            const tokenSet = await client.callback(this.config.redirectUri, params, { nonce, state })

            const claims = tokenSet.claims()
            const domain = this.getDomain(claims)
            if (!claims.email) {
                throw new RequestError(AuthError.InvalidEmail)
            }

            const admin = {
                email: claims.email,
                first_name: claims.given_name ?? claims.name,
                last_name: claims.family_name,
                image_url: claims.picture,
                domain,
            }

            await this.login(admin, ctx, state)

            ctx.cookies.set('nonce', null)
            ctx.cookies.set('relaystate', null)
            ctx.cookies.set('organization', null)
        } catch (error: any) {
            App.main.error.notify(error)
            throw new RequestError(AuthError.OpenIdValidationError)
        }
    }

    private async getClient(): Promise<BaseClient> {
        if (this.client) return this.client

        const issuer = await Issuer.discover(this.config.issuerUrl)

        // TODO: Should we validate that we can use the issuer?
        this.client = new issuer.Client({
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            redirect_uris: [this.config.redirectUri],
            response_types: this.config.responseTypes ?? ['id_token'],
        })
        return this.client
    }

    private getDomain(claims: IdTokenClaims): string | undefined {
        if (claims.hd && typeof claims.hd === 'string') {
            return claims.hd
        }
    }
}
