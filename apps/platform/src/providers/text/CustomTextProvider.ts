import { InboundTextMessage, TextMessage, TextResponse } from './TextMessage'
import TextError from './TextError'
import { TextProvider } from './TextProvider'
import { ProviderControllers, ProviderParams, ProviderSchema } from '../Provider'
import { createController } from '../ProviderService'

interface CustomDataParams {
    api_key: string
    phone_number: string
}

interface CustomProviderParams extends ProviderParams {
    data: CustomDataParams
}

export default class CustomTextProvider extends TextProvider {
    api_key!: string
    phone_number!: string

    static namespace = 'custom'
    static meta = {
        name: 'Custom',
        url: 'https://customsms.com',
        icon: 'https://parcelvoy.com/providers/custom.svg',
    }

    static schema = ProviderSchema<CustomProviderParams, CustomDataParams>('customTextProviderParams', {
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
        const response = await fetch('https://api.customsms.com/v1/messages/send', {
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
