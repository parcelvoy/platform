import { InboundTextMessage, TextMessage, TextResponse } from './TextMessage'
import TextError from './TextError'
import { TextProvider } from './TextProvider'
import { ProviderControllers, ProviderParams, ProviderSchema } from '../Provider'
import { createController } from '../ProviderService'

interface NexmoDataParams {
    api_key: string
    api_secret: string
    phone_number: string
}

interface NexmoProviderParams extends ProviderParams {
    data: NexmoDataParams
}

export default class NexmoTextProvider extends TextProvider {
    api_key!: string
    api_secret!: string
    phone_number!: string

    static namespace = 'nexmo'
    static meta = {
        name: 'Nexmo',
        url: 'https://nexmo.com',
        icon: 'https://parcelvoy.com/providers/vonage.svg',
    }

    static schema = ProviderSchema<NexmoProviderParams, NexmoDataParams>('nexmoTextProviderParams', {
        type: 'object',
        required: ['api_key', 'api_secret', 'phone_number'],
        properties: {
            api_key: {
                type: 'string',
                title: 'API Key',
            },
            api_secret: {
                type: 'string',
                title: 'API Secret',
            },
            phone_number: { type: 'string' },
        },
    })

    async send(message: TextMessage): Promise<TextResponse> {
        const { to, text } = message
        const { api_key, api_secret, phone_number: from } = this
        const response = await fetch('https://rest.nexmo.com/sms/json', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'parcelvoy/v1 (+https://github.com/parcelvoy/platform)',
            },
            body: JSON.stringify({
                api_key,
                api_secret,
                from,
                to,
                text,
            }),
        })

        if (response.ok) {
            const responseBody = await response.json()
            const responseMessage = responseBody.messages[0]

            // Nexmo always returns 200 even for error
            if (responseMessage.status !== '0') {
                throw new TextError(this.type, this.phone_number, `Request failed with status: ${responseMessage.status}, error: ${responseMessage['error-text']}`)
            } else {
                return {
                    message,
                    success: true,
                    response: responseMessage['message-id'],
                }
            }
        } else {
            throw new TextError(this.type, this.phone_number, `Request failed with status ${response.status}`)
        }
    }

    // https://developer.vonage.com/messaging/sms/guides/inbound-sms
    parseInbound(inbound: any): InboundTextMessage {
        return {
            to: inbound.to,
            from: inbound.msisdn,
            text: inbound.text || '',
        }
    }

    static controllers(): ProviderControllers {
        const admin = createController('text', this)
        return { admin, public: this.inbound(this.namespace) }
    }
}
