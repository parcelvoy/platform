import Koa from 'koa'
import UserController from './UserController'

export default (api: Koa) => {
    api.use(UserController.routes())
}
