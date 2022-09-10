import { WebhookTemplate } from '../../models/Template'
import Render, { Variables } from '../../render'
import { WebhookProvider } from './WebhookProvider'

export default class WebhookChannel {
    provider: WebhookProvider
    constructor(provider?: WebhookProvider) {
        if (provider) {
            this.provider = provider
        } else {
            throw new Error('A valid webhook driver must be defined!')
        }
    }

    async send(options: WebhookTemplate, variables: Variables) {
        const headers = Object.keys(options.headers).reduce((headers, key) => {
            headers[key] = Render(options.headers[key], variables)
            return headers
        }, {} as Record<string, string>)

        const body = Object.keys(options.body).reduce((body, key) => {
            body[key] = Render(options.body[key], variables)
            return body
        }, {} as Record<string, any>)

        const endpoint = Render(options.endpoint, variables)
        const method = options.method

        await this.provider.send({
            endpoint,
            method,
            headers,
            body,
        })
    }
}
