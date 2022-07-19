import { logger } from '../../config/logger'
import { WebhookMessage, WebhookProvider, WebhookResponse } from './Webhook'

export default class LoggerWebhookProvider implements WebhookProvider {
    async send (options: WebhookMessage): Promise<WebhookResponse> {
        logger.info(options)
        return {
            message: options,
            success: true,
            response: ''
        }
    }
}
