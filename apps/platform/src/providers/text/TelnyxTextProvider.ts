import App from '../../app'
import { encodeHashid } from '../../utilities'
import { ExternalProviderParams, ProviderControllers, ProviderSchema, ProviderSetupMeta } from '../Provider'
import { createController } from '../ProviderService'
import TextError, { UndeliverableTextError, UnsubscribeTextError } from './TextError'
import { InboundTextMessage, TextMessage, TextResponse } from './TextMessage'
import { TextProvider } from './TextProvider'

/**
 * https://developers.telnyx.com/api/messaging/send-message
 */

interface TelnyxDataParams {
    api_key: string
    phone_number: string
}

interface TelnyxProviderParams extends ExternalProviderParams {
    data: TelnyxDataParams
}

export default class TelnyxTextProvider extends TextProvider {
    api_key!: string
    phone_number!: string

    static namespace = 'telnyx'
    static meta = {
        name: 'Telnyx',
        description: '',
        url: 'https://telnyx.com',
        icon: 'https://parcelvoy.com/providers/telnyx.svg',
    }

    static schema = ProviderSchema<TelnyxProviderParams, TelnyxDataParams>('telnyxTextProviderParams', {
        type: 'object',
        required: ['api_key', 'phone_number'],
        properties: {
            api_key: {
                type: 'string',
                title: 'API Key',
            },
            phone_number: { type: 'string' },
        },
    })

    loadSetup(app: App): ProviderSetupMeta[] {
        return [{
            name: 'Inbound URL',
            value: `${app.env.apiBaseUrl}/providers/${encodeHashid(this.id)}/${(this.constructor as any).namespace}/inbound`,
        }]
    }

    async send(message: TextMessage): Promise<TextResponse> {
        const { to, text } = message
        const { phone_number: from } = this

        const response = await fetch('https://api.telnyx.com/v2/messages', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.api_key}`,
                'Content-Type': 'application/json',
                'User-Agent': 'parcelvoy/v1 (+https://github.com/parcelvoy/platform)',
            },
            body: JSON.stringify({
                from,
                to,
                text,
            }),
        })

        const responseBody = await response.json()
        if (response.ok) {
            return {
                message,
                success: true,
                response: responseBody.id,
            }
        } else {

            // https://support.telnyx.com/en/articles/6505121-telnyx-messaging-error-codes
            const error = responseBody.errors?.[0]
            if (error?.code === '40300') {
                // Unable to send because recipient has unsubscribed
                throw new UnsubscribeTextError(this.type, to, error.title)
            } else if (error?.code === '40008' || error?.code === '40301') {
                // Unable to send because region is not enabled
                throw new UndeliverableTextError(this.type, to, error.title)
            }
            throw new TextError(this.type, to, error?.title, responseBody)
        }
    }

    // https://www.twilio.com/docs/messaging/guides/webhook-request
    parseInbound(inbound: any): InboundTextMessage {
        const payload = inbound.data.payload
        return {
            to: payload.to,
            from: payload.from.phone_number,
            text: payload.text || '',
        }
    }

    static controllers(): ProviderControllers {
        const admin = createController('text', this)
        return { admin, public: this.inbound(this.namespace) }
    }
}
