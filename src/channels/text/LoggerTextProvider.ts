import { logger } from '../../config/logger'
import { randomInt, sleep } from '../../utilities'
import { TextMessage, TextResponse } from './TextMessage'
import { TextProvider } from './TextProvider'

export default class LoggerTextProvider extends TextProvider {
    addLatency?: boolean

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

    parseInbound(inbound: any): TextMessage {
        return {
            to: inbound.to,
            from: inbound.from,
            text: inbound.text,
        }
    }
}
