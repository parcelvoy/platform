import { Provider } from '../../core/Provider'
import { TextMessage, TextResponse } from './TextMessage'

export type TextProviderName = 'nexmo' | 'plivo' | 'twilio' | 'logger'

export abstract class TextProvider extends Provider {
    abstract send(message: TextMessage): Promise<TextResponse>
}
