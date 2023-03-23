import App from '../app'
import Provider, { ProviderMap, ProviderParams, ExternalProviderParams } from './Provider'

export const getProvider = async (id: number, projectId?: number) => {
    return await Provider.find(id, qb => projectId ? qb.where('project_id', projectId) : qb)
}

export const loadProvider = async <T extends Provider>(id: number, mapper: ProviderMap<T>, projectId?: number, app = App.main) => {

    // Check if value is cached in memory
    const cache = app.get<T>(Provider.cacheKey.internal(id))
    if (cache) return cache

    // If not, fetch from DB
    const record = await Provider.find(id, qb => projectId ? qb.where('project_id', projectId) : qb, app.db)
    if (!record) return

    // Map to appropriate type, cache and return
    const mappedValue = mapper(record)
    cacheProvider(mappedValue)
    return mappedValue
}

export const loadDefaultProvider = async <T extends Provider>(group: string, projectId: number, mapper: ProviderMap<T>, app = App.main) => {

    // Check if value is cached in memory
    const cache = app.get<T>(Provider.cacheKey.default(projectId, group))
    if (cache) return cache

    // If not, fetch from DB
    const record = await Provider.table()
        .where('project_id', projectId)
        .where('group', group)
        .where('is_default', true)
        .first()
    if (!record) return

    // Map to appropriate type, cache and return
    const mappedValue = mapper(record)
    cacheProvider(mappedValue)
    return mappedValue
}

export const createProvider = async (projectId: number, params: ProviderParams) => {
    return await Provider.insertAndFetch({
        ...params,
        project_id: projectId,
    })
}

export const updateProvider = async (id: number, params: ExternalProviderParams, app = App.main) => {
    const provider = await Provider.updateAndFetch(id, params)
    app.remove(Provider.cacheKey.internal(provider.id))
    app.remove(Provider.cacheKey.default(provider.project_id, provider.group))
    if (provider.external_id) {
        app.remove(Provider.cacheKey.external(provider.external_id))
    }
    return provider
}

export const cacheProvider = (provider: Provider, app = App.main) => {
    app.set(Provider.cacheKey.internal(provider.id), provider)
    if (provider.is_default) {
        app.set(Provider.cacheKey.default(provider.project_id, provider.group), provider)
    }
    if (provider.external_id) {
        app.set(Provider.cacheKey.external(provider.external_id), provider)
    }
}
