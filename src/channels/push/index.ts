import Router from '@koa/router'
import { loadProvider } from '../ProviderRepository'
import LocalPushProvider from './LocalPushProvider'
import LoggerPushProvider from './LoggerPushProvider'
import PushChannel from './PushChannel'
import { PushProvider, PushProviderName } from './PushProvider'

const typeMap = {
    local: LocalPushProvider,
    logger: LoggerPushProvider,
}

export const providerMap = (record: { name: PushProviderName }): PushProvider => {
    return typeMap[record.name].fromJson(record)
}

export const loadPushChannel = async (providerId: number, projectId: number): Promise<PushChannel | undefined> => {
    const provider = await loadProvider(providerId, projectId, providerMap)
    if (!provider) return
    return new PushChannel(provider)
}

export const loadPushControllers = async (router: Router) => {
    for (const type of Object.values(typeMap)) {
        const controllers = type.controllers()
        router.use(
            controllers.routes(),
            controllers.allowedMethods(),
        )
    }
}
