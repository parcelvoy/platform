import { WebhookTemplate } from '../../render/Template'
import Render, { Variables } from '../../render'
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

    async send(options: WebhookTemplate, variables: Variables): Promise<WebhookResponse> {
        const headers = this.compile(options.headers, variables)
        const endpoint = Render(options.endpoint, variables)
        const method = options.method
        const body = method === 'POST' || method === 'PATCH' || method === 'PUT'
            ? this.compile(options.body, variables)
            : undefined

        return await this.provider.send({
            endpoint,
            method,
            headers,
            body,
        })
    }

    private compile(object: Record<string, string> | undefined, variables: Variables) {
        if (!object) return {}
        return Object.keys(object).reduce((body, key) => {
            body[key] = Render(object[key], variables)
            return body
        }, {} as Record<string, any>)
    }
}
