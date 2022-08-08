import { logger } from '../../config/logger'
import { TextMessage, TextResponse } from './TextMessage'
import { TextProvider } from './TextSender'

export default class LoggerTextProvider implements TextProvider {
    async send(message: TextMessage): Promise<TextResponse> {
        logger.info(message)
        return {
            message,
            success: true,
            response: '',
        }
    }
}
