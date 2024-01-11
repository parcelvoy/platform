import EmailChannel from '../providers/email/EmailChannel'
import TextChannel from '../providers/text/TextChannel'
import WebhookChannel from '../providers/webhook/WebhookChannel'
import PushChannel from '../providers/push/PushChannel'
import InAppChannel from '../providers/inapp/InAppChannel'

export type Channel = EmailChannel | TextChannel | PushChannel | WebhookChannel | InAppChannel
export type ChannelType = 'email' | 'push' | 'text' | 'webhook' | 'in_app'
