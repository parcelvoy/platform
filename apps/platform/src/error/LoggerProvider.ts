import { ErrorHandlerTypeConfig } from './ErrorHandler'
import ErrorHandlingProvider from './ErrorHandlerProvider'
import { logger } from '../config/logger'

export interface LoggerErrorConfig extends ErrorHandlerTypeConfig {
    driver: 'logger'
}

export default class LoggerErrorProvider implements ErrorHandlingProvider {

    attach() { /**  */ }

    notify(error: Error, context?: Record<string, any>) {
        logger.error({
            error,
            context,
        }, error.message)
    }
}
