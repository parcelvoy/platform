import { logger } from '../../config/logger'
import { TextMessage, TextResponse } from './TextMessage'
import { TextProvider } from './TextProvider'

export default class LoggerTextProvider extends TextProvider {
    async send(message: TextMessage): Promise<TextResponse> {
        logger.info(message)
        return {
            message,
            success: true,
            response: '',
        }
    }
}
