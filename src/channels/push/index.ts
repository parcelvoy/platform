import Router from '@koa/router'
import { ProviderMeta } from '../Provider'
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

export const loadPushControllers = async (router: Router, providers: ProviderMeta[]) => {
    for (const type of Object.values(typeMap)) {
        const controllers = type.controllers()
        router.use(
            controllers.routes(),
            controllers.allowedMethods(),
        )
        providers.push({
            ...type.meta,
            type: type.namespace,
            channel: 'push',
            schema: type.schema,
        })
    }
}
