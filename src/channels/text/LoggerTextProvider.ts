import Router from '@koa/router'
import { logger } from '../../config/logger'
import { randomInt, sleep } from '../../utilities'
import { ProviderParams, ProviderSchema } from '../Provider'
import { createController } from '../ProviderService'
import { InboundTextMessage, TextMessage, TextResponse } from './TextMessage'
import { TextProvider } from './TextProvider'

export default class LoggerTextProvider extends TextProvider {
    addLatency?: boolean

    static namespace = 'logger'
    static meta = { name: 'Logger' }

    static schema = ProviderSchema<ProviderParams, any>('loggerTextProviderParams', {
        type: 'object',
    })

    async send(message: TextMessage): Promise<TextResponse> {

        // Allow for having random latency to aid in performance testing
        if (this.addLatency) await sleep(randomInt())

        logger.info(message, 'provider:text:logger')
        return {
            message,
            success: true,
            response: '',
        }
    }

    parseInbound(inbound: any): InboundTextMessage {
        return {
            to: inbound.to,
            from: inbound.from,
            text: inbound.text,
        }
    }

    static controllers(): Router {
        return createController('text', this.namespace, this.schema)
    }
}
