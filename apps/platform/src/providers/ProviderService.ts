import Router from '@koa/router'
import { ProjectState } from '../auth/AuthMiddleware'
import { PageParams } from '../core/searchParams'
import { JSONSchemaType, validate } from '../core/validate'
import Provider, { ProviderControllers, ProviderGroup, ProviderMeta, ProviderParams } from './Provider'
import { createProvider, getProvider, loadProvider, updateProvider } from './ProviderRepository'
import App from '../app'

export const allProviders = async (projectId: number) => {
    return await Provider.all(qb => qb.where('project_id', projectId).whereNull('deleted_at'))
}

export const hasProvider = async (projectId: number) => {
    return await Provider.exists(qb => qb.where('project_id', projectId))
}

export const pagedProviders = async (params: PageParams, projectId: number) => {
    return await Provider.search(
        { ...params, fields: ['name', 'group'] },
        b => b.where('project_id', projectId).whereNull('deleted_at'),
        App.main.db,
        (item) => {
            item.setup = item.loadSetup(App.main)
            return item
        },
    )
}

export const archiveProvider = async (id: number, projectId: number) => {
    await Provider.archive(id, qb => qb.where('project_id', projectId))
    return getProvider(id, projectId)
}

export const loadController = (routers: ProviderControllers, provider: typeof Provider): ProviderMeta => {
    const { admin: adminRouter, public: publicRouter } = provider.controllers()
    if (routers.admin && adminRouter) {
        routers.admin.use(
            adminRouter.routes(),
            adminRouter.allowedMethods(),
        )
    }
    if (routers.public && publicRouter) {
        routers.public.use(
            publicRouter.routes(),
            publicRouter.allowedMethods(),
        )
    }
    return {
        ...provider.meta,
        group: provider.group,
        type: provider.namespace,
        schema: provider.schema,
    }
}

export const createController = (group: ProviderGroup, type: typeof Provider): Router => {
    const router = new Router<
        ProjectState & { provider?: Provider }
    >({
        prefix: `/${group}/${type.namespace}`,
    })

    router.post('/', async ctx => {
        const payload = validate(type.schema as JSONSchemaType<ProviderParams>, ctx.request.body)

        ctx.body = await createProvider(ctx.state.project.id, { ...payload, type: type.namespace, group })
    })

    router.param('providerId', async (value, ctx, next) => {
        const map = (record: any) => {
            return type.fromJson(record)
        }
        ctx.state.provider = await loadProvider(parseInt(value, 10), map, ctx.state.project.id)
        if (!ctx.state.provider) {
            ctx.throw(404)
            return
        }
        return await next()
    })

    router.get('/:providerId', async ctx => {
        ctx.body = ctx.state.provider
    })

    router.patch('/:providerId', async ctx => {
        const payload = validate(type.schema as JSONSchemaType<ProviderParams>, ctx.request.body)
        ctx.body = updateProvider(ctx.state.provider!.id, payload)
    })

    return router
}
