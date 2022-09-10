import { defaultProvider } from '../../env/Provider'
import LocalWebhookProvider from './LocalWebhookProvider'
import LoggerWebhookProvider from './LoggerWebhookProvider'
import WebhookChannel from './WebhookChannel'
import { WebhookProvider, WebhookProviderName } from './WebhookProvider'

export const providerMap = (record: { name: WebhookProviderName }): WebhookProvider => {
    return {
        local: LocalWebhookProvider.fromJson(record),
        logger: LoggerWebhookProvider.fromJson(record),
    }[record.name]
}

export const loadWebhookChannel = async (projectId: number): Promise<WebhookChannel | undefined> => {
    const provider = await defaultProvider('webhook', projectId, providerMap)
    if (!provider) return
    return new WebhookChannel(provider)
}
