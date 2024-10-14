import { Context } from 'koa'
import AuthProvider from './AuthProvider'
import OpenIDProvider, { OpenIDConfig } from './OpenIDAuthProvider'
import GoogleProvider, { GoogleConfig } from './GoogleAuthProvider'
import SAMLProvider, { SAMLConfig } from './SAMLAuthProvider'
import { DriverConfig } from '../config/env'
import BasicAuthProvider, { BasicAuthConfig } from './BasicAuthProvider'
import Organization from '../organizations/Organization'
import App from '../app'
import MultiAuthProvider, { MultiAuthConfig } from './MultiAuthProvider'
import EmailAuthProvider, { EmailAuthConfig } from './EmailAuthProvider'

export type AuthProviderName = 'basic' | 'email' | 'saml' | 'openid' | 'google' | 'multi'

export type AuthProviderConfig = BasicAuthConfig | EmailAuthConfig | SAMLConfig | OpenIDConfig | GoogleConfig | MultiAuthConfig

export interface AuthConfig {
    driver: AuthProviderName[]
    tokenLife: number
    basic: BasicAuthConfig
    email: EmailAuthConfig
    saml: SAMLConfig
    openid: OpenIDConfig
    google: GoogleConfig
    multi: MultiAuthConfig
}

export { BasicAuthConfig, SAMLConfig, OpenIDConfig }

export interface AuthTypeConfig extends DriverConfig {
    driver: AuthProviderName
    name?: string
}

interface AuthMethod {
    driver: AuthProviderName
    name: string
}

export const initProvider = (config?: AuthProviderConfig): AuthProvider => {
    if (config?.driver === 'basic') {
        return new BasicAuthProvider(config)
    } else if (config?.driver === 'email') {
        return new EmailAuthProvider(config)
    } else if (config?.driver === 'saml') {
        return new SAMLProvider(config)
    } else if (config?.driver === 'openid') {
        return new OpenIDProvider(config)
    } else if (config?.driver === 'google') {
        return new GoogleProvider(config)
    } else if (config?.driver === 'multi') {
        return new MultiAuthProvider()
    } else {
        throw new Error('A valid auth driver must be set!')
    }
}

export const authMethods = async (organization?: Organization): Promise<AuthMethod[]> => {

    if (!App.main.env.config.multiOrg) return mapMethods(App.main.env.auth)

    // If we know the org, don't require any extra steps like
    // providing email since we know where to route you. Otherwise
    // we need context to properly fetch SSO and such.
    return organization
        ? [mapMethod(organization.auth)]
        : mapMethods(App.main.env.auth)
}

export const checkAuth = (organization?: Organization): boolean => {
    return organization != null && organization.auth != null
}

export const startAuth = async (ctx: Context): Promise<void> => {
    const provider = await loadProvider(ctx)
    return await provider.start(ctx)
}

export const validateAuth = async (ctx: Context): Promise<void> => {
    const provider = await loadProvider(ctx)
    return await provider.validate(ctx)
}

const loadProvider = async (ctx: Context): Promise<AuthProvider> => {
    const driver = ctx.params.driver as AuthProviderName
    const organization = ctx.state.organization
    if (organization && App.main.env.config.multiOrg) {
        return initProvider(organization.auth)
    }

    return initProvider(App.main.env.auth[driver])
}

const mapMethods = (config: AuthConfig): AuthMethod[] => {
    const drivers = config.driver
    return drivers.map((driver) => mapMethod(config[driver]))
}

const mapMethod = ({ driver, name }: AuthTypeConfig): AuthMethod => ({
    driver,
    name: name ?? `Continue with ${driver}`,
})
