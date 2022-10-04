import Router from '@koa/router'
import jwt from 'koa-jwt'
import { sign } from 'jsonwebtoken'
import client from '../client/ClientController'
import ProjectController from '../projects/ProjectController'
import CampaignController from '../campaigns/CampaignController'
import ListController from '../lists/ListController'
import SubscriptionController, { publicRouter as PublicSubscriptionController } from '../subscriptions/SubscriptionController'
import JourneyController from '../journey/JourneyController'
import ImageController from '../storage/ImageController'
import TemplateController from '../render/TemplateController'

const register = (router: Router, routes: Router) => {
    router.use(routes.routes(), routes.allowedMethods())
}

export default (api: import('../api').default) => {

    const admin = new Router({ prefix: '/admin' })

    admin.post('/jwt', ctx => {
        const { user_id, project_id } = ctx.request.body
        ctx.body = sign({
            id: user_id,
            project_id,
            exp: Date.now() + 1000 * 24 * 60 * 60,
        }, api.app.env.secret)
    })

    admin.use(jwt({ secret: api.app.env.secret }))

    register(admin, ProjectController)
    register(admin, CampaignController)
    register(admin, ListController)
    register(admin, SubscriptionController)
    register(admin, JourneyController)
    register(admin, ImageController)
    register(admin, TemplateController)

    api.use(admin.routes()).use(admin.allowedMethods())

    api.use(client.routes()).use(client.allowedMethods())

    api.use(PublicSubscriptionController.routes())
        .use(PublicSubscriptionController.allowedMethods())
}
