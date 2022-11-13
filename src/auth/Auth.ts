import { Context } from 'koa'
import AuthProvider from './AuthProvider'
import OpenIDProvider, { OpenIDConfig } from './OpenIDAuthProvider'
import SAMLProvider, { SAMLConfig } from './SAMLAuthProvider'
import { DriverConfig } from '../config/env'
import LoggerAuthProvider from './LoggerAuthProvider'
import { logger } from '../config/logger'

export type AuthProviderName = 'saml' | 'openid' | 'logger'

export type AuthConfig = SAMLConfig | OpenIDConfig

export interface AuthTypeConfig extends DriverConfig {
    tokenLife: number
    driver: AuthProviderName
}

export default class Auth {
    provider: AuthProvider

    constructor(config?: AuthConfig) {
        if (config?.driver === 'saml') {
            this.provider = new SAMLProvider(config)
        } else if (config?.driver === 'openid') {
            this.provider = new OpenIDProvider(config)
        } else {
            logger.info({}, 'No valid auth provider has been set, using logger as fallback')
            this.provider = new LoggerAuthProvider()
        }
    }

    async start(ctx: Context): Promise<void> {
        return await this.provider.start(ctx)
    }

    async validate(ctx: Context): Promise<void> {
        return await this.provider.validate(ctx)
    }
}
