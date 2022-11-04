import Router from '@koa/router'
import jwt from 'koa-jwt'
import ProjectController from '../projects/ProjectController'
import CampaignController from '../campaigns/CampaignController'
import ListController from '../lists/ListController'
import SubscriptionController, { publicRouter as PublicSubscriptionController } from '../subscriptions/SubscriptionController'
import JourneyController from '../journey/JourneyController'
import ImageController from '../storage/ImageController'
import AuthController from '../auth/AuthController'

const register = (parent: Router, ...routers: Router[]) => {
    for (const router of routers) {
        parent.use(router.routes(), router.allowedMethods())
    }
    return parent
}

export default (api: import('../api').default) => {

    // admin (jwt)
    const admin = new Router({ prefix: '/admin' })
    admin.use(jwt({ secret: api.app.env.auth.secret }))
    register(admin,
        ProjectController,
        CampaignController,
        ListController,
        SubscriptionController,
        JourneyController,
        ImageController,
    )

    // client (api key)
    const client = new Router({ prefix: '/client' })
    register(client,
        // lower permission endpoint,
        register(new Router(),
            // higher permission endpoints
        ),
    )

    const root = register(new Router(),
        admin,
        client,
        PublicSubscriptionController,
        AuthController,
    )

    api.use(root.allowedMethods()).use(root.routes())

}
