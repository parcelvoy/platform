import { Variables, Wrap } from '../../render'
import { EmailTemplate } from '../../render/Template'
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
        if (!variables.user.email) throw new Error('Unable to send a text message to a user with no email.')

        const compiled = template.compile(variables)
        const email = {
            ...compiled,
            to: variables.user.email,
            html: Wrap(compiled.html, variables), // Add link and open tracking
        }
        await this.provider.send(email)
    }

    async verify(): Promise<boolean> {
        await this.provider.verify()
        return true
    }
}
