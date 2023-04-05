import Koa from 'koa'

export type ErrorHandlerProviderName = 'bugsnag' | 'sentry'

export default interface ErrorHandlerProvider {
    attach(api: Koa): void
}
