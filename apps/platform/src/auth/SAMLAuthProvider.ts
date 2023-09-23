import { Profile, SAML } from '@node-saml/node-saml'
import { SignatureAlgorithm } from '@node-saml/node-saml/lib/types'
import { Context } from 'koa'
import { URL } from 'url'
import { RequestError } from '../core/errors'
import { AuthTypeConfig } from './Auth'
import AuthProvider from './AuthProvider'
import AuthError from './AuthError'
import { firstQueryParam } from '../utilities'
import { addSeconds } from 'date-fns'

export interface SAMLConfig extends AuthTypeConfig {
    driver: 'saml'
    callbackUrl: string // our url?
    entryPoint: string // SSO url?
    issuer: string
    cert: string
    identifierFormat?: string
    signatureAlgorithm?: SignatureAlgorithm
    digestAlgorithm?: SignatureAlgorithm
    wantAuthnResponseSigned?: boolean
}

// {
//     issuer: 'https://accounts.google.com/o/saml2?idpid=C04a7bn68',
//     sessionIndex: '_c6cf1198b7b67a9a4f8500f1ae22b79c',
//     nameID: 'canderson@twochris.com',
//     nameIDFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
//     nameQualifier: undefined,
//     spNameQualifier: undefined,
//     firstName: 'Chris',
//     lastName: 'Anderson',
//     attributes: { firstName: 'Chris', lastName: 'Anderson' },
//     getAssertionXml: [Function (anonymous)],
//     getAssertion: [Function (anonymous)],
//     getSamlResponseXml: [Function (anonymous)]
//   },

interface SAMLProfile extends Profile {
    first_name?: string
    last_name?: string
}

interface SAMLResponse {
    profile: Profile | null
    loggedOut: boolean
}

interface ValidatedSAMLResponse extends SAMLResponse {
    profile: SAMLProfile | null
}

export default class SAMLAuthProvider extends AuthProvider {

    saml: SAML
    constructor(config: SAMLConfig) {
        super()
        this.saml = new SAML(config)
    }

    async start(ctx: Context) {
        const host = ctx.request.headers?.host

        const { r } = ctx.request.query
        const relayState = (Array.isArray(r) ? r[0] : r) || ''

        const url = await this.saml.getAuthorizeUrlAsync(relayState, host, {})

        const organization = ctx.state.organization
        if (organization) {
            ctx.cookies.set('organization', `${organization.id}`, {
                secure: ctx.request.secure,
                httpOnly: true,
                expires: addSeconds(Date.now(), 3600),
                signed: true,
            })
        }

        ctx.redirect(url)
    }

    async validate(ctx: Context) {
        const result = await this.parseValidation(ctx)
        if (!result) throw new RequestError(AuthError.SAMLValidationError)

        const [response, state] = result

        // If there is no profile we take no action
        if (!response.profile) throw new RequestError(AuthError.SAMLValidationError)
        if (response.loggedOut) {
            await this.logout({ email: response.profile.nameID }, ctx)
            return
        }

        // If we are logging in, grab profile and create tokens
        const { first_name, last_name, nameID: email } = response.profile
        const domain = this.getDomain(email)
        if (!email || !domain) throw new RequestError(AuthError.SAMLValidationError)

        await this.login({ first_name, last_name, email, domain }, ctx, state)

        ctx.cookies.set('organization', null)
    }

    private getDomain(email: string): string | undefined {
        return email?.split('@')[1]
    }

    private async parseValidation(ctx: Context): Promise<[ValidatedSAMLResponse, string?] | undefined> {
        const { query, body, href } = ctx.request
        if (query?.SAMLResponse || query?.SAMLRequest) {
            const originalQuery = new URL(href).href
            const { RelayState } = query
            return [
                await this.saml.validateRedirectAsync(query, originalQuery),
                firstQueryParam(RelayState),
            ]
        } else if (body?.SAMLResponse) {
            return [
                await this.saml.validatePostResponseAsync(body),
                body.RelayState,
            ]
        } else if (body?.SAMLRequest) {
            return [
                await this.saml.validatePostRequestAsync(body),
                body.RelayState,
            ]
        }
    }
}
