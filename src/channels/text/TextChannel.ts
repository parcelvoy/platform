import { TextTemplate } from '../../render/Template'
import Render, { Variables } from '../../render'
import { TextProvider } from './TextProvider'

export default class TextChannel {
    private provider: TextProvider
    constructor(provider?: TextProvider) {
        if (provider) {
            this.provider = provider
        } else {
            throw new Error('A valid text message driver must be defined!')
        }
    }

    async send(options: TextTemplate, variables: Variables) {
        if (!variables.user.phone) throw new Error('Unable to send a text message to a user with no phone number.')

        const message = {
            to: variables.user.phone,
            from: options.from,
            text: Render(options.text, variables),
        }

        await this.provider.send(message)
    }
}
