import { loadProvider } from '../ProviderRepository'
import LocalPushProvider from './LocalPushProvider'
import LoggerPushProvider from './LoggerPushProvider'
import PushChannel from './PushChannel'
import { PushProvider, PushProviderName } from './PushProvider'

type PushProviderDerived = { new (): PushProvider } & typeof PushProvider
export const typeMap: Record<string, PushProviderDerived> = {
    local: LocalPushProvider,
    logger: LoggerPushProvider,
}

export const providerMap = (record: { type: PushProviderName }): PushProvider => {
    return typeMap[record.type].fromJson(record)
}

export const loadPushChannel = async (providerId: number, projectId: number): Promise<PushChannel | undefined> => {
    const provider = await loadProvider(providerId, providerMap, projectId)
    if (!provider) return
    return new PushChannel(provider)
}

export const pushProviders = Object.values(typeMap)
