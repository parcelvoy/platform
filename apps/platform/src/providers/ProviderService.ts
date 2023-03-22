import Router from '@koa/router'
import { ProjectState } from '../auth/AuthMiddleware'
import { SearchParams } from '../core/searchParams'
import { JSONSchemaType, validate } from '../core/validate'
import Provider, { ExternalProviderParams, ProviderControllers, ProviderGroup, ProviderMeta } from './Provider'
import { createProvider, getProvider, updateProvider } from './ProviderRepository'

export const allProviders = async (projectId: number) => {
    return await Provider.all(qb => qb.where('project_id', projectId))
}

export const pagedProviders = async (params: SearchParams, projectId: number) => {
    return await Provider.searchParams(
        params,
        ['name', 'group'],
        b => b.where({ project_id: projectId }),
    )
}

export const loadControllers = <T extends Record<string, any>>(typeMap: T, channel: string) => {
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
                channel,
                schema: type.schema,
            })
        }
    }
}

export const createController = <T extends ExternalProviderParams>(group: ProviderGroup, type: string, schema: JSONSchemaType<T>, externalKey?: (payload: T) => string): Router => {
    const router = new Router<
        ProjectState & { provider?: Provider }
    >({
        prefix: `/${group}/${type}`,
    })

    router.post('/', async ctx => {
        const payload = validate(schema, ctx.request.body)

        ctx.body = await createProvider(ctx.state.project.id, { ...payload, external_id: externalKey?.(payload), type, group })
    })

    router.param('providerId', async (value, ctx, next) => {
        ctx.state.provider = await getProvider(parseInt(value, 10), ctx.state.project.id)
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
        const payload = validate(schema, ctx.request.body)
        ctx.body = updateProvider(ctx.state.provider!.id, payload)
    })

    return router
}
