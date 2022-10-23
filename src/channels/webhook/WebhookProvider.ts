import Provider from '../Provider'
import { Webhook, WebhookResponse } from './Webhook'

export type WebhookProviderName = 'local' | 'logger'

export abstract class WebhookProvider extends Provider {
    abstract send(message: Webhook): Promise<WebhookResponse>
}
