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

        this.use(koaBody())
            .use(cors())
            .use((ctx, next) => {
                ctx.state.app = this.app
                return next()
            })
            .use(serve('./public', {
                hidden: true,
                defer: true,
            }))

        this.use(async (ctx, next) => {
            try {
                await next()
            } catch (error) {
                if (error instanceof RequestError) {
                    ctx.status = error.statusCode ?? 400
                    ctx.body = error
                } else {
                    throw error
                }
            }
        })

        controllers(this)
    }
}
