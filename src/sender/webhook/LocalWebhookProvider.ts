import { WebhookMessage, WebhookProvider, WebhookResponse } from './Webhook'

export default class LocalWebhookProvider implements WebhookProvider {
    async send (options: WebhookMessage): Promise<WebhookResponse> {
        const { method, endpoint, headers, body } = options
        const response = await fetch(endpoint, {
            method,
            headers,
            body: JSON.stringify(body)
        })

        const responseBody = await response.json()
        if (response.ok) {
            return {
                message: options,
                success: true,
                response: responseBody
            }
        } else {
            throw new Error(`${response.status} - ${responseBody.message}`)
        }
    }
}
