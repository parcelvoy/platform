import Render, { Variables } from '../../render'
import { EmailTemplate } from '../../render/Template'
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

    async send(options: EmailTemplate, variables: Variables) {
        if (!variables.user.email) throw new Error('Unable to send a text message to a user with no email.')

        const message: Email = {
            to: variables.user.email,
            subject: Render(options.subject, variables),
            from: Render(options.from, variables),
            html: Render(options.html_body, variables),
            text: Render(options.text_body, variables),
        }
        if (options.reply_to) message.reply_to = Render(options.reply_to, variables)
        if (options.cc) message.cc = Render(options.cc, variables)
        if (options.bcc) message.bcc = Render(options.bcc, variables)

        await this.provider.send(message)
    }

    async verify(): Promise<boolean> {
        await this.provider.verify()
        return true
    }
}
