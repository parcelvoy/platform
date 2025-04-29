import * as Sentry from '@sentry/node'
import Koa from 'koa'
import { ErrorHandlerTypeConfig } from './ErrorHandler'
import ErrorHandlingProvider from './ErrorHandlerProvider'

export interface SentryConfig extends ErrorHandlerTypeConfig {
    driver: 'sentry'
    dsn: string
}

export default class SentryProvider implements ErrorHandlingProvider {
    constructor(config: SentryConfig) {
        Sentry.init({ dsn: config.dsn })
    }

    attach(api: Koa) {
        api.on('error', (err, ctx) => {
            Sentry.withScope((scope) => {
                if (ctx.state.admin) scope.setUser({ id: ctx.state.admin.id.toString() })
                scope.addEventProcessor((event) => {
                    return Sentry.addRequestDataToEvent(event, ctx.request)
                })
                Sentry.captureException(err)
            })
        })
    }

    notify(error: Error, context?: Record<string, any>) {
        Sentry.captureException(error, {
            extra: context,
        })
    }
}
