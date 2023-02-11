import Router from '@koa/router'
import { ProviderMeta } from '../Provider'
import { loadProvider } from '../ProviderRepository'
import LocalWebhookProvider from './LocalWebhookProvider'
import LoggerWebhookProvider from './LoggerWebhookProvider'
import WebhookChannel from './WebhookChannel'
import { WebhookProvider, WebhookProviderName } from './WebhookProvider'

const typeMap = {
    local: LocalWebhookProvider,
    logger: LoggerWebhookProvider,
}

export const providerMap = (record: { type: WebhookProviderName }): WebhookProvider => {
    return typeMap[record.type].fromJson(record)
}

export const loadWebhookChannel = async (providerId: number, projectId: number): Promise<WebhookChannel | undefined> => {
    const provider = await loadProvider(providerId, projectId, providerMap)
    if (!provider) return
    return new WebhookChannel(provider)
}

export const loadWebhookControllers = async (router: Router, providers: ProviderMeta[]) => {
    for (const type of Object.values(typeMap)) {
        const controllers = type.controllers()
        router.use(
            controllers.routes(),
            controllers.allowedMethods(),
        )
        providers.push({
            ...type.meta,
            type: type.namespace,
            channel: 'webhook',
            schema: type.schema,
        })
    }
}
