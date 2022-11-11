import Router from '@koa/router'
import jwt from 'koa-jwt'
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
import Api from '../api'
import App from '../app'
import Project from '../projects/Project'

const register = (parent: Router, ...routers: Router[]) => {
    for (const router of routers) {
        parent.use(router.routes(), router.allowedMethods())
    }
    return parent
}

export interface JwtAdmin {
    id: number
}

export interface State {
    app: App
}

export interface AuthState extends State {
    admin: JwtAdmin
}

export interface ProjectState extends AuthState {
    project: Project
}

export default (api: import('../api').default) => {

    // Register the three main levels of routers
    const root = register(new Router(),
        adminRouter(api),
        clientRouter(),
        publicRouter(),
    )

    api.use(root.routes())
        .use(root.allowedMethods())
}

/**
 * Admin Router
 * All endpoints for use with admin UI control plane
 * @param api Instance of API for access to secrets
 * @returns Router
 */
export const adminRouter = (api: Api) => {
    const admin = new Router({ prefix: '/admin' })
    admin.use(jwt({
        secret: api.app.env.secret,
        key: 'admin',
    }))
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
export const projectRouter = () => {
    const router = new Router({ prefix: '/projects/:project' })
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
    )
}

/**
 * Client Router
 * All endpoints that can be accessed using client level authentication.
 * For use in apps or on websites.
 * @returns Router
 */
export const clientRouter = () => {
    const router = new Router({ prefix: '/client' })
    return register(router,
        // lower permission endpoint,
        ClientController,
        register(new Router(),
            // higher permission endpoints
        ),
    )
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
