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
}
