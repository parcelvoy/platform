import { DriverConfig } from '../config/env'
import { logger } from '../config/logger'
import Koa from 'koa'
import BugSnagProvider, { BugSnagConfig } from './BugSnagProvider'
import ErrorHandlerProvider, { ErrorHandlerProviderName } from './ErrorHandlerProvider'
import SentryProvider, { SentryConfig } from './SentryProvider'
import LoggerErrorProvider, { LoggerErrorConfig } from './LoggerProvider'

export type ErrorConfig = BugSnagConfig | SentryConfig | LoggerErrorConfig

export interface ErrorHandlerTypeConfig extends DriverConfig {
    driver: ErrorHandlerProviderName
}

export class ContextError extends Error {
    context?: Record<string, any>
}

export default class ErrorHandler {
    provider?: ErrorHandlerProvider
    constructor(config: ErrorConfig) {
        if (config?.driver === 'bugsnag') {
            this.provider = new BugSnagProvider(config)
        } else if (config?.driver === 'sentry') {
            this.provider = new SentryProvider(config)
        } else {
            this.provider = new LoggerErrorProvider()
        }
    }

    attach(api: Koa) {
        this.provider?.attach(api)
    }

    notify(error: Error, context?: Record<string, any>) {
        this.provider?.notify(
            error,
            error instanceof ContextError
                ? { ...context, ...error.context }
                : context,
        )
        if (!this.provider) logger.error(error)
    }
}
