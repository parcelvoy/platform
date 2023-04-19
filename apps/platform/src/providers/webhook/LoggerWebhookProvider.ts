import { logger } from '../../config/logger'
import { randomInt, sleep } from '../../utilities'
import { ProviderControllers, ProviderParams, ProviderSchema } from '../Provider'
import { createController } from '../ProviderService'
import { Webhook, WebhookResponse } from './Webhook'
import { WebhookProvider } from './WebhookProvider'

export default class LoggerWebhookProvider extends WebhookProvider {
    addLatency?: boolean

    static namespace = 'logger'
    static meta = {
        name: 'Logger',
        icon: 'https://parcelvoy.com/providers/logger.svg',
    }

    static schema = ProviderSchema<ProviderParams, any>('loggerWebhookProviderParams', {
        type: 'object',
    })

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

    static controllers(): ProviderControllers {
        return { admin: createController('webhook', this) }
    }
}
