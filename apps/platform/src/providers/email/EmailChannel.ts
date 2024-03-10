import { Variables, Wrap } from '../../render'
import { EmailTemplate } from '../../render/Template'
import { encodeHashid } from '../../utilities'
import { Email } from './Email'
import EmailProvider from './EmailProvider'

export default class EmailChannel {
    readonly provider: EmailProvider
    constructor(provider?: EmailProvider) {
        if (provider) {
            this.provider = provider
            this.provider.boot?.()
        } else {
            throw new Error('A valid mailer must be defined!')
        }
    }

    async send(template: EmailTemplate, variables: Variables) {
        if (!variables.user.email) throw new Error('Unable to send a message to a user with no email.')

        // TODO: Explore caching the Handlebars template
        // before passing in variables for better performance
        const compiled = template.compile(variables)
        const email: Email = {
            ...compiled,
            to: variables.user.email,
            html: Wrap({
                html: compiled.html,
                preheader: compiled.preheader,
                variables,
            }), // Add link and open tracking
            headers: {
                'X-Campaign-Id': encodeHashid(variables.context.campaign_id),
                'X-Subscription-Id': encodeHashid(variables.context.subscription_id),
            },
        }
        const result = await this.provider.send(email)
        return {
            ...result,
            message: compiled,
        }
    }

    async verify(): Promise<boolean> {
        await this.provider.verify()
        return true
    }
}
