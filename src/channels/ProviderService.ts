import Router from '@koa/router'
import { ProjectState } from '../auth/AuthMiddleware'
import { JSONSchemaType, validate } from '../core/validate'
import Provider, { ExternalProviderParams, ProviderGroup } from './Provider'
import { createProvider, getProvider, updateProvider } from './ProviderRepository'

export const allProviders = async (projectId: number) => {
    return await Provider.all(qb => qb.where('project_id', projectId))
}

export const createController = <T extends ExternalProviderParams>(group: ProviderGroup, type: string, schema: JSONSchemaType<T>): Router => {
    const router = new Router<
        ProjectState & { provider?: Provider }
    >({
        prefix: `/${group}/${type}`,
    })

    router.post('/', async ctx => {
        const payload = validate(schema, ctx.request.body)

        ctx.body = await createProvider(ctx.state.project.id, { ...payload, type, group })
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

    router.put('/:providerId', async ctx => {
        const payload = validate(schema, ctx.request.body)
        ctx.body = updateProvider(ctx.state.provider!.id, payload)
    })

    return router
}
