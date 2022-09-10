import Router from '@koa/router'
import ProjectController from '../projects/ProjectController'
import client from '../client/ClientController'
import CampaignController from '../campaigns/CampaignController'

export default (api: import('../api').default) => {

    const admin = new Router({ prefix: '/admin' })
    // TODO authentication?

    admin.use(ProjectController.routes()).use(ProjectController.allowedMethods())

    admin.use(CampaignController.routes()).use(CampaignController.allowedMethods())

    api.use(admin.routes()).use(admin.allowedMethods())

    api.use(client.routes()).use(client.allowedMethods())
}
