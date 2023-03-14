import EmailChannel from '../providers/email/EmailChannel'
import TextChannel from '../providers/text/TextChannel'
import WebhookChannel from '../providers/webhook/WebhookChannel'
import PushChannel from '../providers/push/PushChannel'

export type Channel = EmailChannel | TextChannel | PushChannel | WebhookChannel
export type ChannelType = 'email' | 'push' | 'text' | 'webhook'
