import App from '../app'
import { clearChannel } from '../config/channels'
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

export const createProvider = async (params: ProviderParams) => {
    const provider = await Provider.insertAndFetch(params)

    // Set all existing providers to no longer be default
    if (params.is_default) {
        await resetDefaultTo(provider)
    }

    return provider
}

export const updateProvider = async (id: number, params: ExternalProviderParams) => {
    const provider = await Provider.updateAndFetch(id, params)

    // Set all existing providers to no longer be default
    if (params.is_default) {
        await resetDefaultTo(provider)
    }

    return provider
}

export const resetDefaultTo = async (provider: Provider) => {
    await Provider.update(
        qb => qb.whereNot('id', provider.id)
            .where('project_id', provider.project_id)
            .where('group', provider.group),
        { is_default: false },
    )
    clearChannel(provider.project_id, provider.group)
}

export const cacheProvider = (provider: Provider, app = App.main) => {
    if (!provider.external_id) return
    app.set(Provider.cacheKey(provider.external_id), provider)
}
