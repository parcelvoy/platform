import { TextTemplate } from '../../render/Template'
import { Variables } from '../../render'
import { TextProvider } from './TextProvider'
import { InboundTextMessage } from './TextMessage'

export default class TextChannel {
    readonly provider: TextProvider
    constructor(provider?: TextProvider) {
        if (provider) {
            this.provider = provider
        } else {
            throw new Error('A valid text message driver must be defined!')
        }
    }

    async send(template: TextTemplate, variables: Variables) {
        if (!variables.user.phone) throw new Error('Unable to send a text message to a user with no phone number.')

        const message = {
            to: variables.user.phone,
            ...template.compile(variables),
        }

        await this.provider.send(message)
    }

    parseInbound(body: any): InboundTextMessage {
        return this.provider.parseInbound(body)
    }
}
