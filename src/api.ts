import Koa from 'koa'
import koaBody from 'koa-body'
import cors from '@koa/cors'
import controllers from './controllers'

export default class Api extends Koa {

    constructor (
        public app: import('./app').default
    ) {
        super()

        this.proxy = process.env.NODE_ENV !== 'development'

        this.use(koaBody())
            .use(cors())
            .use((ctx, next) => {
                ctx.state.app = this.app
                return next()
            })

        controllers(this)
    }
}
