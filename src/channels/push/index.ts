import { defaultProvider } from '../../core/Provider'
import LocalPushProvider from './LocalPushProvider'
import LoggerPushProvider from './LoggerPushProvider'
import PushChannel from './PushChannel'
import { PushProvider, PushProviderName } from './PushProvider'

export const providerMap = (record: { name: PushProviderName }): PushProvider => {
    return {
        local: LocalPushProvider.fromJson(record),
        logger: LoggerPushProvider.fromJson(record),
    }[record.name]
}

export const loadPushChannel = async (projectId: number): Promise<PushChannel | undefined> => {
    const provider = await defaultProvider('push', projectId, providerMap)
    if (!provider) return
    return new PushChannel(provider)
}
