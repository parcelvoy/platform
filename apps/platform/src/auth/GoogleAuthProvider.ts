import { AuthTypeConfig } from './Auth'
import AuthProvider, { AuthContext } from './AuthProvider'
import OpenIDAuthProvider from './OpenIDAuthProvider'

export interface GoogleConfig extends AuthTypeConfig {
    driver: 'google'
    clientId: string
    clientSecret: string
    redirectUri: string
}

export default class GoogleAuthProvider extends AuthProvider {

    private provider: OpenIDAuthProvider
    constructor(config: GoogleConfig) {
        super()
        this.provider = new OpenIDAuthProvider({
            ...config,
            driver: 'openid',
            issuerUrl: 'https://accounts.google.com',
            responseTypes: ['id_token'],
        })
    }

    async start(ctx: AuthContext): Promise<void> {
        return await this.provider.start(ctx)
    }

    async validate(ctx: AuthContext): Promise<void> {
        return await this.provider.validate(ctx)
    }
}
