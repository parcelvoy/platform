import { addSeconds } from 'date-fns'
import { Context } from 'koa'
import { Issuer, generators, BaseClient } from 'openid-client'
import { AuthTypeConfig } from './Auth'
import AuthProvider from './AuthProvider'

export interface OpenIDConfig extends AuthTypeConfig {
    driver: 'openid'
    issuerUrl: string // 'https://accounts.google.com'
    clientId: string
    cliendSecret: string
    redirectUri: string
}

export default class OpenIDAuthProvider extends AuthProvider {

    private config: OpenIDConfig
    constructor(config: OpenIDConfig) {
        super()
        this.config = config
    }

    async start(ctx: Context): Promise<void> {

        const client = await this.getClient()

        const nonce = generators.nonce()
        // store the nonce in your framework's session mechanism, if it is a cookie based solution
        // it should be httpOnly (not readable by javascript) and encrypted.

        ctx.cookies.set('nonce', nonce, {
            secure: true,
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
        console.log('got nonce', nonce)

        const params = client.callbackParams(ctx.req)
        // TODO: Not sure what URL to use here
        const tokenSet = await client.callback(this.config.redirectUri, params, { nonce })
        console.log('received and validated tokens %j', tokenSet)
        console.log('validated ID Token claims %j', tokenSet.claims())

        const userinfo = await client.userinfo(tokenSet)
        console.log('userinfo %j', userinfo)
    }

    private async getClient(): Promise<BaseClient> {
        const issuer = await Issuer.discover(this.config.issuerUrl)
        console.log('Discovered issuer %s %O', issuer.issuer, issuer.metadata)

        return new issuer.Client({
            client_id: this.config.clientId,
            client_secret: this.config.cliendSecret,
            redirect_uris: [this.config.redirectUri],
            response_types: ['id_token'],
        })
    }
}
