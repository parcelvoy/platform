import Router from '@koa/router'
import jwt from 'koa-jwt'
import { sign } from 'jsonwebtoken'
import client from '../client/ClientController'
import ProjectController from '../projects/ProjectController'
import CampaignController from '../campaigns/CampaignController'
import ListController from '../lists/ListController'
import SubscriptionController from '../subscriptions/SubscriptionController'

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

    admin.use(ProjectController.routes()).use(ProjectController.allowedMethods())

    admin.use(CampaignController.routes()).use(CampaignController.allowedMethods())

    admin.use(ListController.routes()).use(ListController.allowedMethods())

    admin.use(SubscriptionController.routes()).use(SubscriptionController.allowedMethods())

    api.use(admin.routes()).use(admin.allowedMethods())

    api.use(client.routes()).use(client.allowedMethods())
}
