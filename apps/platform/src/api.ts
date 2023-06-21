import Koa from 'koa'
import koaBody from 'koa-body'
import cors from '@koa/cors'
import serve from 'koa-static'
import controllers, { register } from './config/controllers'
import { RequestError } from './core/errors'
import { logger } from './config/logger'
import Router from '@koa/router'

export default class Api extends Koa {
    router = new Router({ prefix: '/api' })
    controllers?: Record<string, Router>

    constructor(
        public app: import('./app').default,
    ) {
        super()

        this.proxy = process.env.NODE_ENV !== 'development'

        app.error.attach(this)
        this.use(async (ctx, next) => {
            try {
                await next()
            } catch (error: any) {

                logger.error({ error, ctx }, 'error')
                if (error instanceof RequestError) {
                    ctx.status = error.statusCode ?? 400
                    ctx.body = error
                    return
                } else {
                    ctx.status = 400
                    ctx.body = process.env.NODE_ENV === 'production'
                        ? {
                            status: 'error',
                            error: 'An error occurred with this request.',
                        }
                        : {
                            status: 'error',
                            error: {
                                message: error.message,
                                stack: error.stack,
                            },
                        }
                }

                ctx.app.emit('error', error, ctx)
            }
        })

        this.use(koaBody())
            .use(cors())
            .use(serve('./public', {
                hidden: true,
                defer: !app.env.mono,
            }))

        this.registerControllers()
    }

    getControllers() {
        return controllers(this.app)
    }

    registerControllers() {
        this.controllers = this.getControllers()
        this.register(...Object.values(this.controllers))
    }

    register(...routers: Router[]) {
        const root = register(this.router, ...routers)
        this.use(root.routes())
            .use(root.allowedMethods())
    }
}
