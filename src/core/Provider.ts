import App from '../app'
import { Database } from '../config/database'
import Model from './Model'

export type ProviderGroup = 'email' | 'text' | 'push' | 'webhook'

export class Provider extends Model {
    name!: string
    project_id!: number
    external_id!: string
    group!: ProviderGroup
    data!: Record<string, any>
    is_default!: boolean

    static cacheKey(externalId: string) {
        return `providers_${externalId}`
    }

    parseJson(json: any): void {
        super.parseJson(json)

        Object.assign(this, this.data)
    }
}

export type ProviderMap<T extends Provider> = (record: any) => T

export const defaultProvider = async <T extends Provider>(group: ProviderGroup, projectId: number, mapper: ProviderMap<T>, db?: Database): Promise<T | undefined> => {
    const record = await Provider.table(db)
        .where('group', group)
        .where('project_id', projectId)
        .where('is_default', true)
        .first()
    if (!record) return
    return mapper(record)
}

export const getProvider = async <T extends Provider>(externalId: string, mapper: ProviderMap<T>, app = App.main): Promise<T | undefined> => {

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

export const cacheProvider = (provider: Provider, app = App.main) => {
    app.set(Provider.cacheKey(provider.external_id), provider)
}
