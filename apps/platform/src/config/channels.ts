import EmailChannel from '../channels/email/EmailChannel'
import TextChannel from '../channels/text/TextChannel'
import WebhookChannel from '../channels/webhook/WebhookChannel'
import PushChannel from '../channels/push/PushChannel'

export type Channel = EmailChannel | TextChannel | PushChannel | WebhookChannel
export type ChannelType = 'email' | 'push' | 'text' | 'webhook'
