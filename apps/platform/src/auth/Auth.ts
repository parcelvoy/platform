import { Context } from 'koa'
import AuthProvider from './AuthProvider'
import OpenIDProvider, { OpenIDConfig } from './OpenIDAuthProvider'
import SAMLProvider, { SAMLConfig } from './SAMLAuthProvider'
import { DriverConfig } from '../config/env'
import BasicAuthProvider, { BasicAuthConfig } from './BasicAuthProvider'
import { getOrganizationByUsername } from '../organizations/OrganizationService'

export type AuthProviderName = 'basic' | 'saml' | 'openid' | 'logger'

export type AuthConfig = BasicAuthConfig | SAMLConfig | OpenIDConfig

export interface AuthTypeConfig extends DriverConfig {
    tokenLife: number
    driver: AuthProviderName
}

export default class Auth {
    provider: AuthProvider

    constructor(config?: AuthConfig) {
        this.provider = Auth.provider(config)
    }

    static provider(config?: AuthConfig): AuthProvider {
        if (config?.driver === 'basic') {
            return new BasicAuthProvider(config)
        } else if (config?.driver === 'saml') {
            return new SAMLProvider(config)
        } else if (config?.driver === 'openid') {
            return new OpenIDProvider(config)
        } else {
            throw new Error('A valid auth driver must be set!')
        }
    }

    async start(ctx: Context): Promise<void> {
        const provider = await this.loadProvider(ctx)
        return await provider.start(ctx)
    }

    async validate(ctx: Context): Promise<void> {
        const provider = await this.loadProvider(ctx)
        return await provider.validate(ctx)
    }

    private async loadProvider(ctx: Context): Promise<AuthProvider> {
        if (ctx.subdomains && ctx.subdomains[0]) {
            const subdomain = ctx.subdomains[0]
            const org = await getOrganizationByUsername(subdomain)
            ctx.state.organization = org
            if (org) return Auth.provider(org.auth)
        }
        return this.provider
    }
}
