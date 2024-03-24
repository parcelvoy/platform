import Provider, { ProviderGroup } from '../Provider'
import { Push, PushResponse } from './Push'

export type PushProviderName = 'local' | 'logger'

export abstract class PushProvider extends Provider {
    boot?(): void
    abstract send(message: Push): Promise<PushResponse>

    static group = 'push' as ProviderGroup
}
