import { getOrganizationByEmail } from '../organizations/OrganizationService'
import { AuthTypeConfig, initProvider } from './Auth'
import AuthProvider, { AuthContext } from './AuthProvider'

export interface MultiAuthConfig extends AuthTypeConfig {
    driver: 'multi'
}

export default class MultiAuthProvider extends AuthProvider {
    async start(ctx: AuthContext): Promise<void> {

        // Redirect to the default for the given org
        if (ctx.query.email || ctx.request.body.email) {
            const email = ctx.query.email ?? ctx.request.body.email
            const organization = await getOrganizationByEmail(email)
            if (organization) {
                return await initProvider(organization.auth).start(ctx)
            }
        }

        throw new Error('No organization found.')
    }

    async validate(): Promise<void> {
        // Will never be called since it routes to other providers
    }
}
