import Provider from '../Provider'
import { InboundTextMessage, TextMessage, TextResponse } from './TextMessage'

export type TextProviderName = 'nexmo' | 'plivo' | 'twilio' | 'logger'

export abstract class TextProvider extends Provider {
    abstract send(message: TextMessage): Promise<TextResponse>
    abstract parseInbound(inbound: any): InboundTextMessage
}
