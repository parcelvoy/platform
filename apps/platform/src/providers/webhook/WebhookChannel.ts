import { WebhookTemplate } from '../../render/Template'
import { Variables } from '../../render'
import { WebhookProvider } from './WebhookProvider'
import { WebhookResponse } from './Webhook'

export default class WebhookChannel {
    readonly provider: WebhookProvider
    constructor(provider?: WebhookProvider) {
        if (provider) {
            this.provider = provider
        } else {
            throw new Error('A valid webhook driver must be defined!')
        }
    }

    async send(template: WebhookTemplate, variables: Variables) {
        const message = template.compile(variables)
        return await this.provider.send(message)
    }
}
