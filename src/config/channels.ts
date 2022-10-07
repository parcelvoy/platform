import EmailChannel from '../channels/email/EmailChannel'
import { loadEmailChannel } from '../channels/email'
import TextChannel from '../channels/text/TextChannel'
import { loadTextChannel } from '../channels/text'
import WebhookChannel from '../channels/webhook/WebhookChannel'
import { loadWebhookChannel } from '../channels/webhook'
import App from '../app'
import PushChannel from '../channels/push/PushChannel'
import { loadPushChannel } from '../channels/push'

export type Channel = EmailChannel | TextChannel | PushChannel | WebhookChannel
export type ChannelType = 'email' | 'push' | 'text' | 'webhook'

async function loadChannel(projectId: number, type: 'email', app?: App): Promise<EmailChannel>
async function loadChannel(projectId: number, type: 'text', app?: App): Promise<TextChannel>
async function loadChannel(projectId: number, type: 'push', app?: App): Promise<PushChannel>
async function loadChannel(projectId: number, type: 'webhook', app?: App): Promise<WebhookChannel>
async function loadChannel(projectId: number, type: ChannelType, app = App.main): Promise<Channel> {

    const key = `projects_${projectId}_channels_${type}`
    const cache = app.get<Channel>(key)
    if (cache) return cache

    const channels = {
        email: (projectId: number) => loadEmailChannel(projectId),
        text: (projectId: number) => loadTextChannel(projectId),
        push: (projectId: number) => loadPushChannel(projectId),
        webhook: (projectId: number) => loadWebhookChannel(projectId),
    }
    app.set(key, await channels[type](projectId))
    return app.get(key)
}

export { loadChannel }
