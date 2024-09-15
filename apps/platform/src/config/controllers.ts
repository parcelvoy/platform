import Router from '@koa/router'
import send from 'koa-send'
import ProjectController, { ProjectSubrouter, projectMiddleware } from '../projects/ProjectController'
import ClientController from '../client/ClientController'
import SegmentController from '../client/SegmentController'
import CampaignController from '../campaigns/CampaignController'
import ListController from '../lists/ListController'
import SubscriptionController, { publicRouter as PublicSubscriptionController } from '../subscriptions/SubscriptionController'
import JourneyController from '../journey/JourneyController'
import ImageController from '../storage/ImageController'
import AuthController from '../auth/AuthController'
import { adminRouter as AdminProviderController, publicRouter as PublicProviderController } from '../providers/ProviderController'
import LinkController from '../render/LinkController'
import TemplateController from '../render/TemplateController'
import UserController from '../users/UserController'
import ProfileController from '../profile/ProfileController'
import TagController from '../tags/TagController'
import { authMiddleware, scopeMiddleware } from '../auth/AuthMiddleware'
import ProjectAdminController from '../projects/ProjectAdminController'
import ProjectApiKeyController from '../projects/ProjectApiKeyController'
import ProjectLocaleController from '../projects/ProjectLocaleController'
import AdminController from '../auth/AdminController'
import OrganizationController from '../organizations/OrganizationController'
import App from '../app'
import { organizationMiddleware } from '../organizations/OrganizationMiddleware'
import ResourceController from '../render/ResourceController'

export const register = (parent: Router, ...routers: Router[]) => {
    for (const router of routers) {
        parent.use(router.routes(), router.allowedMethods())
    }
    return parent
}

export type SubRouter = Router & { global?: boolean }

export default (app: App) => {

    const routers: Record<string, SubRouter> = {
        admin: adminRouter(),
        client: clientRouter(),
        public: publicRouter(),
    }

    // If we are running in mono mode, we need to also serve the UI
    if (app.env.config.monoDocker) {
        const ui = new Router()
        ui.get('/(.*)', async (ctx, next) => {
            try {
                await send(ctx, './public/index.html')
            } catch {
                return next()
            }
        })
        routers.ui = ui
        routers.ui.global = true
    }

    return routers
}

/**
 * Admin Router
 * All endpoints for use with admin UI control plane
 * @returns Router
 */
export const adminRouter = () => {
    const admin = new Router({ prefix: '/admin' })
    admin.use(authMiddleware)
    admin.use(organizationMiddleware)
    admin.use(scopeMiddleware(['admin', 'secret']))
    return register(admin,
        ProjectController,
        projectRouter('/projects/:project'),
        ProfileController,
        AdminController,
        OrganizationController,
    )
}

/**
 * Project Router
 * A subrouter to the admin router which wraps project specific endpoints
 * inside of a project scope
 * @returns Router
 */
export const projectRouter = (prefix?: string) => {
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
        AdminProviderController,
        ProjectAdminController,
        ProjectApiKeyController,
        ProjectLocaleController,
        UserController,
        TagController,
        ResourceController,
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
    register(router, SegmentController)

    // Secret client routes
    router.use(scopeMiddleware('secret'))
    register(router, projectRouter())

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
    router.use(organizationMiddleware)

    router.get('/health', async (ctx) => {
        ctx.body = {
            status: 'ok',
            environment: process.env.NODE_ENV,
            time: new Date(),
        }
    })
    return register(router,
        AuthController,
        PublicSubscriptionController,
        PublicProviderController,
        LinkController,
    )
}
