import EmailChannel from '../channels/email/EmailChannel'
import { loadChannel as loadEmailChannel } from '../channels/email'
import TextChannel from '../channels/text/TextChannel'
import { loadChannel as loadTextChannel } from '../channels/text'
import WebhookChannel from '../channels/webhook/WebhookChannel'
import { loadChannel as loadWebhookChannel } from '../channels/webhook'
import { Database } from './database'

export interface Channels {
    email?: EmailChannel
    text?: TextChannel
    webhook?: WebhookChannel
}

export type Channel = EmailChannel | TextChannel | WebhookChannel
export type ChannelKey = keyof Channels

export class ChannelAccessor {
    private channels: Channels

    constructor(channels: Channels) {
        this.channels = channels
    }

    channel(type: 'email'): EmailChannel | undefined
    channel(type: 'text'): TextChannel | undefined
    channel(type: 'webhook'): WebhookChannel | undefined
    channel(type: ChannelKey): Channel | undefined {
        return this.channels[type]
    }

    get email(): EmailChannel | undefined {
        return this.channel('email')
    }

    get text(): TextChannel | undefined {
        return this.channel('text')
    }

    get webhook(): WebhookChannel | undefined {
        return this.channel('webhook')
    }
}

export const configChannels = async (db: Database): Promise<Channels> => {
    return {
        email: await loadEmailChannel(db),
        text: await loadTextChannel(db),
        webhook: await loadWebhookChannel(db),
    }
}
