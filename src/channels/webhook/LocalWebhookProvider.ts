import Router from '@koa/router'
import { ProviderParams, ProviderSchema } from '../Provider'
import { createController } from '../ProviderService'
import { Webhook, WebhookResponse } from './Webhook'
import { WebhookProvider } from './WebhookProvider'

export default class LocalWebhookProvider extends WebhookProvider {
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
        const providerParams = ProviderSchema<ProviderParams, any>('localWebhookProviderParams', {
            type: 'object',
        })

        return createController('webhook', 'local', providerParams)
    }
}
