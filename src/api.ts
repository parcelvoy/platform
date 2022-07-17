import Koa from 'koa'
import router from './controllers'

export default class Api extends Koa {
    constructor () {
        super()

        this.proxy = process.env.NODE_ENV !== 'development'

        // TODO: Need body parser
        // TODO: Need error handler

        // Register routes
        router(this)
    }
}
