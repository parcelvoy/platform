import { logger } from '../../config/logger'
import { Webhook, WebhookResponse } from './Webhook'
import { WebhookProvider } from './WebhookSender'

export default class LoggerWebhookProvider implements WebhookProvider {
    async send(options: Webhook): Promise<WebhookResponse> {
        logger.info(options)
        return {
            message: options,
            success: true,
            response: '',
        }
    }
}
