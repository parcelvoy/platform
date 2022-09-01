import { Database } from '../../config/database'
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

export const loadChannel = async (db: Database): Promise<WebhookChannel | undefined> => {
    const provider = await defaultProvider('webhook', providerMap, db)
    if (!provider) return
    return new WebhookChannel(provider)
}
