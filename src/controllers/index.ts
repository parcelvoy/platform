import Router from '@koa/router'
import projectController from './projectController'
import client from './clientController'

export default (api: import('../api').default) => {
    
    const admin = new Router({ prefix: '/admin' })
    //TODO authentication?

    admin.use(projectController.routes()).use(projectController.allowedMethods())

    api.use(admin.routes()).use(admin.allowedMethods())

    api.use(client.routes()).use(client.allowedMethods())

}
