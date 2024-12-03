import { logger } from '../../config/logger'
import { randomInt, sleep } from '../../utilities'
import { ExternalProviderParams, ProviderControllers, ProviderSchema } from '../Provider'
import { createController } from '../ProviderService'
import { Push, PushResponse } from './Push'
import { PushProvider } from './PushProvider'
export default class LoggerPushProvider extends PushProvider {
    addLatency?: boolean

    static namespace = 'logger'
    static meta = {
        name: 'Logger',
        icon: 'https://parcelvoy.com/providers/logger.svg',
    }

    static schema = ProviderSchema<ExternalProviderParams, any>('loggerPushProviderParams', {
        type: 'object',
    })

    async send(push: Push): Promise<PushResponse> {

        // Allow for having random latency to aid in performance testing
        if (this.addLatency) await sleep(randomInt())

        logger.info(push, 'provider:push:logger')
        return {
            push,
            success: true,
            response: '',
            invalidTokens: [],
        }
    }

    static controllers(): ProviderControllers {
        return { admin: createController('push', this) }
    }
}
