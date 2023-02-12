import App from '../app'
import Provider, { ProviderMap, ProviderParams, ExternalProviderParams } from './Provider'

export const getProvider = async (id: number, projectId: number) => {
    return await Provider.find(id, qb => qb.where('project_id', projectId))
}

export const loadProvider = async <T extends Provider>(id: number, projectId: number, mapper: ProviderMap<T>, app = App.main) => {

    // Check if value is cached in memory
    const cache = app.get<T>(Provider.cacheKey.internal(id))
    if (cache) return cache

    // If not, fetch from DB
    const record = await Provider.table()
        .where('project_id', projectId)
        .where('id', id)
        .first()
    if (!record) return

    // Map to appropriate type, cache and return
    const mappedValue = mapper(record)
    cacheProvider(mappedValue)
    return mappedValue
}

export const getProviderByExternalId = async <T extends Provider>(externalId: string, mapper: ProviderMap<T>, app = App.main): Promise<T | undefined> => {

    // Check if value is cached in memory
    const cache = app.get<T>(Provider.cacheKey.external(externalId))
    if (cache) return cache

    // If not, fetch from DB
    const record = await Provider.table()
        .where('external_id', externalId)
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
    if (provider.external_id) {
        app.remove(Provider.cacheKey.external(provider.external_id))
    }
    return provider
}

export const cacheProvider = (provider: Provider, app = App.main) => {
    app.set(Provider.cacheKey.internal(provider.id), provider)
    if (!provider.external_id) return
    app.set(Provider.cacheKey.external(provider.external_id), provider)
}
