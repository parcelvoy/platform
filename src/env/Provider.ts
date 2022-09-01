import { Database } from '../config/database'
import Model from '../models/Model'

export type ProviderGroup = 'email' | 'text' | 'push' | 'webhook' | 'queue'

export class Provider extends Model {
    name!: string
    group!: ProviderGroup
    data!: Record<string, any>
    is_default!: boolean

    parseJson(json: any): void {
        super.parseJson(json)

        Object.assign(this, this.data)
    }
}

export type ProviderMap<T extends Provider> = (record: any) => T

export const defaultProvider = async <T extends Provider>(group: ProviderGroup, mapper: ProviderMap<T>, db?: Database): Promise<T | undefined> => {
    const record = await Provider.table(db)
        .where('group', group)
        .where('is_default', true)
        .first()
    if (!record) return
    return mapper(record)
}
