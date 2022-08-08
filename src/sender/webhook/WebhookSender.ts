import { DriverConfig } from '../../config/env'
import { LoggerConfig } from '../../config/logger'
import Render, { Variables } from '../../render'
import LocalWebhookProvider from './LocalWebhookProvider'
import LoggerWebhookProvider from './LoggerWebhookProvider'
import { Webhook, WebhookResponse } from './Webhook'

export type WebhookDriver = 'local' | 'logger'
export interface WebhookTypeConfig extends DriverConfig {
    driver: WebhookDriver
}

export interface LocalConfig extends WebhookTypeConfig {
    driver: 'local'
}

export type WebhookConfig = LocalConfig | LoggerConfig

export interface WebhookProvider {
    send(message: Webhook): Promise<WebhookResponse>
}

export default class WebhookSender {
    provider: WebhookProvider
    constructor(config: WebhookTypeConfig) {
        if (config?.driver === 'local') {
            this.provider = new LocalWebhookProvider()
        } else if (config?.driver === 'logger') {
            this.provider = new LoggerWebhookProvider()
        } else {
            throw new Error('A valid webhook driver must be defined!')
        }
    }

    async send(options: Webhook, variables: Variables) {
        const headers = Object.keys(options.headers).reduce((headers, key) => {
            headers[key] = Render(options.headers[key], variables)
            return headers
        }, {} as Record<string, string>)

        const body = Object.keys(options.body).reduce((body, key) => {
            body[key] = Render(options.body[key], variables)
            return body
        }, {} as Record<string, any>)

        const endpoint = Render(options.endpoint, variables)
        const method = options.method

        await this.provider.send({
            endpoint,
            method,
            headers,
            body,
        })

        // TODO: Create an event for the sent webhook
    }
}
