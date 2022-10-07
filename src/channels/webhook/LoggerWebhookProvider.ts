import { logger } from '../../config/logger'
import { randomInt, sleep } from '../../utilities'
import { Webhook, WebhookResponse } from './Webhook'
import { WebhookProvider } from './WebhookProvider'

export default class LoggerWebhookProvider extends WebhookProvider {
    addLatency?: boolean

    async send(options: Webhook): Promise<WebhookResponse> {

        // Allow for having random latency to aid in performance testing
        if (this.addLatency) await sleep(randomInt())

        logger.info(options, 'provider:webhook:logger')
        return {
            message: options,
            success: true,
            response: '',
        }
    }
}
