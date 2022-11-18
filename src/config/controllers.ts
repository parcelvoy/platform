import Router from '@koa/router'
import ProjectController, { ProjectSubrouter, projectMiddleware } from '../projects/ProjectController'
import ClientController from '../client/ClientController'
import CampaignController from '../campaigns/CampaignController'
import ListController from '../lists/ListController'
import SubscriptionController, { publicRouter as PublicSubscriptionController } from '../subscriptions/SubscriptionController'
import JourneyController from '../journey/JourneyController'
import ImageController from '../storage/ImageController'
import AuthController from '../auth/AuthController'
import ProviderController from '../channels/ProviderController'
import LinkController from '../render/LinkController'
import TemplateController from '../render/TemplateController'
import UserController from '../users/UserController'
import { authMiddleware, scopeMiddleware } from '../auth/AuthMiddleware'

const register = (parent: Router, ...routers: Router[]) => {
    for (const router of routers) {
        parent.use(router.routes(), router.allowedMethods())
    }
    return parent
}

export default (api: import('../api').default) => {

    // Register the three main levels of routers
    const root = register(new Router({ prefix: '/api' }),
        adminRouter(),
        clientRouter(),
        publicRouter(),
    )

    api.use(root.routes())
        .use(root.allowedMethods())

    // for (const i of root.stack) {
    //     console.log(i.path)
    // }
}

/**
 * Admin Router
 * All endpoints for use with admin UI control plane
 * @param api Instance of API for access to secrets
 * @returns Router
 */
export const adminRouter = () => {
    const admin = new Router({ prefix: '/admin' })
    admin.use(authMiddleware)
    admin.use(scopeMiddleware('admin'))
    return register(admin,
        ProjectController,
        projectRouter(),
    )
}

/**
 * Project Router
 * A subrouter to the admin router which wraps project specific endpoints
 * inside of a project scope
 * @returns Router
 */
export const projectRouter = (prefix = '/projects/:project') => {
    const router = new Router({ prefix })
    router.use(projectMiddleware)
    return register(router,
        ProjectSubrouter,
        CampaignController,
        ListController,
        SubscriptionController,
        JourneyController,
        ImageController,
        TemplateController,
        ProviderController,
        UserController,
    )
}

/**
 * Client Router
 * All endpoints that can be accessed using client level authentication.
 * For use by third parties.
 * @returns Router
 */
export const clientRouter = () => {

    // Public client routes
    const router = new Router({ prefix: '/client' })
    router.use(authMiddleware)
    register(router, ClientController)

    // Secret client routes
    router.use(scopeMiddleware('secret'))
    register(router, projectRouter(''))

    return router
}

/**
 * Public Router
 * All endpoints that need to be accessed with absolutely no auth
 * at all. Primarily contains auth endpoints and unsubscribe endpoints.
 * @returns Router
 */
export const publicRouter = () => {
    const router = new Router()
    return register(router,
        AuthController,
        PublicSubscriptionController,
        LinkController,
    )
}
