import { ProviderControllers, ProviderParams, ProviderSchema } from '../Provider'
import { createController } from '../ProviderService'
import { Webhook, WebhookResponse } from './Webhook'
import { WebhookProvider } from './WebhookProvider'

export default class LocalWebhookProvider extends WebhookProvider {
    static namespace = 'local'
    static meta = {
        name: 'Local',
        icon: 'https://parcelvoy.com/providers/webhook.svg',
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
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...headers,
            },
            body: body ? JSON.stringify(body) : undefined,
        })

        let responseBody: any | undefined
        try {
            responseBody = await response.json()
        } catch {
            try {
                responseBody = await response.text()
            } catch {}
        }

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

    static controllers(): ProviderControllers {
        return { admin: createController('webhook', this) }
    }
}
