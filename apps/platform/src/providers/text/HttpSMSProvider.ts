import { InboundTextMessage, TextMessage, TextResponse } from './TextMessage'
import TextError from './TextError'
import { TextProvider } from './TextProvider'
import { ProviderControllers, ProviderParams, ProviderSchema } from '../Provider'
import { createController } from '../ProviderService'

interface HttpSMSDataParams {
    api_key: string
    phone_number: string
}

interface HttpSMSProviderParams extends ProviderParams {
    data: HttpSMSDataParams
}

export default class HttpSMSTextProvider extends TextProvider {
    api_key!: string
    phone_number!: string

    static namespace = 'httpsms'
    static meta = {
        name: 'httpSMS',
        url: 'https://httpsms.com',
        icon: 'https://parcelvoy.com/providers/httpsms.svg',
    }

    static schema = ProviderSchema<HttpSMSProviderParams, HttpSMSDataParams>('httpSMSTextProviderParams', {
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

    async send(message: TextMessage): Promise<TextResponse> {
        const { to, text: content } = message
        const { api_key, phone_number: from } = this
        const response = await fetch('https://api.httpsms.com/v1/messages/send', {
            method: 'POST',
            headers: {
                'x-api-key': api_key,
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'parcelvoy/v1 (+https://github.com/parcelvoy/platform)',
            },
            body: JSON.stringify({
                from,
                to,
                content,
            }),
        })

        if (response.ok) {
            const responseBody = await response.json()
            return {
                message,
                success: true,
                response: responseBody.data,
            }
        } else {
            throw new TextError(this.type, this.phone_number, `Request failed with status ${response.status}`)
        }
    }

    // https://docs.httpsms.com/webhooks/events
    parseInbound(inbound: any): InboundTextMessage {
        return {
            to: inbound.data.owner,
            from: inbound.data.contact,
            text: inbound.data.content || '',
        }
    }

    static controllers(): ProviderControllers {
        const admin = createController('text', this)
        return { admin, public: this.inbound(this.namespace) }
    }
}
