import { logger } from '../../config/logger'
import { Webhook, WebhookResponse } from './Webhook'
import { WebhookProvider } from './WebhookProvider'

export default class LoggerWebhookProvider extends WebhookProvider {
    async send(options: Webhook): Promise<WebhookResponse> {
        logger.info(options)
        return {
            message: options,
            success: true,
            response: '',
        }
    }
}
