import Router from '@koa/router'
import { ProjectState } from '../auth/AuthMiddleware'
import { PageParams } from '../core/searchParams'
import { JSONSchemaType, validate } from '../core/validate'
import Provider, { ProviderControllers, ProviderGroup, ProviderMeta, ProviderParams } from './Provider'
import { createProvider, loadProvider, updateProvider } from './ProviderRepository'

export const allProviders = async (projectId: number) => {
    return await Provider.all(qb => qb.where('project_id', projectId))
}

export const pagedProviders = async (params: PageParams, projectId: number) => {
    return await Provider.search(
        { ...params, fields: ['name', 'group'] },
        b => b.where('project_id', projectId),
    )
}

export const loadControllers = <T extends Record<string, any>>(typeMap: T, group: string) => {
    return async (routers: ProviderControllers, providers: ProviderMeta[]) => {
        for (const type of Object.values(typeMap)) {
            const { admin, public: publicRouter }: ProviderControllers = type.controllers()
            routers.admin.use(
                admin.routes(),
                admin.allowedMethods(),
            )
            if (routers.public && publicRouter) {
                routers.public.use(
                    publicRouter.routes(),
                    publicRouter.allowedMethods(),
                )
            }
            providers.push({
                ...type.meta,
                type: type.namespace,
                group,
                schema: type.schema,
            })
        }
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
