import App from '../app'
import { Database } from '../config/database'
import Provider, { ProviderMap, ProviderGroup, ProviderParams, ExternalProviderParams } from './Provider'

export const defaultProvider = async <T extends Provider>(group: ProviderGroup, projectId: number, mapper: ProviderMap<T>, db?: Database): Promise<T | undefined> => {
    const record = await Provider.table(db)
        .where('group', group)
        .where('project_id', projectId)
        .where('is_default', true)
        .first()
    if (!record) return
    return mapper(record)
}

export const getProvider = async (id: number, projectId: number) => {
    return await Provider.find(id, qb => qb.where('project_id', projectId))
}

export const getProviderByExternalId = async <T extends Provider>(externalId: string, mapper: ProviderMap<T>, app = App.main): Promise<T | undefined> => {

    // Check if value is cached in memory
    const cache = app.get<T>(Provider.cacheKey(externalId))
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

// TODO: Will need to flip all other items to not be default
export const createProvider = async (params: ProviderParams) => {
    return Provider.insertAndFetch(params)
}

export const updateProvider = async (id: number, params: ExternalProviderParams) => {
    return Provider.updateAndFetch(id, params)
}

export const cacheProvider = (provider: Provider, app = App.main) => {
    if (!provider.external_id) return
    app.set(Provider.cacheKey(provider.external_id), provider)
}
