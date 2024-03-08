import { ErrorHandlerTypeConfig } from './ErrorHandler'
import ErrorHandlingProvider from './ErrorHandlerProvider'
import Koa from 'koa'
import Bugsnag from '@bugsnag/js'
import BugsnagPluginKoa from '@bugsnag/plugin-koa'

export interface BugSnagConfig extends ErrorHandlerTypeConfig {
    driver: 'bugsnag'
    apiKey: string
}

export default class BugSnagProvider implements ErrorHandlingProvider {
    constructor(config: BugSnagConfig) {
        Bugsnag.start({
            apiKey: config.apiKey,
            logger: null,
            enabledReleaseStages: ['staging', 'production'],
            plugins: [BugsnagPluginKoa],
        })
    }

    attach(api: Koa) {
        const middleware = Bugsnag.getPlugin('koa')
        if (middleware) {
            api.use(middleware.requestHandler)
            api.on('error', (err, ctx) => {
                if (ctx.state.admin) ctx.bugsnag.setUser(ctx.state.admin.id.toString())
                middleware.errorHandler(err, ctx)
            })
        }
    }

    notify(error: Error, context?: Record<string, any>) {
        Bugsnag.notify(error, (event) => {
            context && event.addMetadata('context', context)
        })
    }
}
