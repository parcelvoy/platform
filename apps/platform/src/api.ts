import Koa from 'koa'
import koaBody from 'koa-body'
import cors from '@koa/cors'
import serve from 'koa-static'
import controllers from './config/controllers'
import { RequestError } from './core/errors'

export default class Api extends Koa {
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
                if (error instanceof RequestError) {
                    ctx.status = error.statusCode ?? 400
                    ctx.body = error
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
                defer: true,
            }))

        controllers(this)
    }
}
