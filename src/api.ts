import Koa from 'koa'
import koaBody from 'koa-body'
import cors from '@koa/cors'
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

        this.use(async (ctx, next) => {
            try {
                await next()
            } catch (err) {
                if (err instanceof RequestError) {
                    return ctx.throw(err.message, err.statusCode)
                }
                throw err
            }
        })

        controllers(this)
    }
}
