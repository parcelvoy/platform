import Router from '@koa/router'
import jwt from 'koa-jwt'
import ProjectController from '../projects/ProjectController'
import CampaignController from '../campaigns/CampaignController'
import ListController from '../lists/ListController'
import SubscriptionController, { publicRouter as PublicSubscriptionController } from '../subscriptions/SubscriptionController'
import JourneyController from '../journey/JourneyController'
import ImageController from '../storage/ImageController'
import AuthController from '../auth/AuthController'
import ProviderController from '../channels/ProviderController'
import LinkController from '../render/LinkController'
import TemplateController from '../render/TemplateController'

const register = (parent: Router, ...routers: Router[]) => {
    for (const router of routers) {
        parent.use(router.routes(), router.allowedMethods())
    }
    return parent
}

export default (api: import('../api').default) => {

    // Bind admin methods to subrouter
    const admin = new Router({ prefix: '/admin' })
    admin.use(jwt({ secret: api.app.env.secret }))
    register(admin,
        ProjectController,
        CampaignController,
        ListController,
        SubscriptionController,
        JourneyController,
        ImageController,
        LinkController,
        TemplateController,
        ProviderController,
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
