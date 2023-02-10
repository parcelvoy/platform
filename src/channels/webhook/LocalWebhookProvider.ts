import Router from '@koa/router'
import { ProviderParams, ProviderSchema } from '../Provider'
import { createController } from '../ProviderService'
import { Webhook, WebhookResponse } from './Webhook'
import { WebhookProvider } from './WebhookProvider'

export default class LocalWebhookProvider extends WebhookProvider {
    static namespace = 'local'
    static meta = {
        name: 'Local',
        icon: 'https://parcelvoy.com/images/webhook.svg',
    }

    static schema = ProviderSchema<ProviderParams, any>('localWebhookProviderParams', {
        type: 'object',
        nullable: true,
        additionalProperties: true,
    })

    async send(options: Webhook): Promise<WebhookResponse> {
        const { method, endpoint, headers, body } = options
        const response = await fetch(endpoint, {
            method,
            headers,
            body: JSON.stringify(body),
        })

        const responseBody = await response.json()
        if (response.ok) {
            return {
                message: options,
                success: true,
                response: responseBody,
            }
        } else {
            throw new Error(`${response.status} - ${responseBody.message}`)
        }
    }

    static controllers(): Router {
        return createController('webhook', this.namespace, this.schema)
    }
}
