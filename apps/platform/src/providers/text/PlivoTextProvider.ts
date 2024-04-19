import { ExternalProviderParams, ProviderControllers, ProviderSchema } from '../Provider'
import { createController } from '../ProviderService'
import TextError from './TextError'
import { InboundTextMessage, TextMessage, TextResponse } from './TextMessage'
import { TextProvider } from './TextProvider'

interface PlivoDataParams {
    auth_id: string
    auth_token: string
    phone_number: string
}

interface PlivoProviderParams extends ExternalProviderParams {
    data: PlivoDataParams
}

export default class PlivoTextProvider extends TextProvider {
    auth_id!: string
    auth_token!: string
    phone_number!: string

    static namespace = 'plivo'
    static meta = {
        name: 'Plivo',
        url: 'https://plivo.com',
        icon: 'https://parcelvoy.com/providers/plivo.svg',
    }

    static schema = ProviderSchema<PlivoProviderParams, PlivoDataParams>('plivoTextProviderParams', {
        type: 'object',
        required: ['auth_id', 'auth_token', 'phone_number'],
        properties: {
            auth_id: {
                type: 'string',
                title: 'Auth ID',
            },
            auth_token: { type: 'string' },
            phone_number: { type: 'string' },
        },
    })

    get apiKey(): string {
        return Buffer.from(`${this.auth_id}:${this.auth_token}`).toString('base64')
    }

    async send(message: TextMessage): Promise<TextResponse> {
        const { to, text } = message
        const response = await fetch(`https://api.plivo.com/v1/Account/${this.auth_id}/Message/`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${this.apiKey}`,
                'Content-Type': 'application/json',
                'User-Agent': 'parcelvoy/v1 (+https://github.com/parcelvoy/platform)',
            },
            body: JSON.stringify({
                src: this.phone_number,
                dst: to,
                text,
            }),
        })

        if (response.ok) {
            const responseBody = await response.json()
            return {
                message,
                success: true,
                response: responseBody.message_uuid[0],
            }
        } else {
            const error = response.status === 401
                ? await response.text()
                : (await response.json()).error
            throw new TextError(this.type, this.phone_number, error)
        }
    }

    // https://www.plivo.com/docs/sms/use-cases/receive-sms/node
    parseInbound(inbound: any): InboundTextMessage {
        return {
            to: inbound.To,
            from: inbound.From,
            text: inbound.Text,
        }
    }

    static controllers(): ProviderControllers {
        const admin = createController('text', this)
        return { admin, public: this.inbound(this.namespace) }
    }
}
