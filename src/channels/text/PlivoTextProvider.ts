import Router from '@koa/router'
import { ExternalProviderParams, ProviderSchema } from '../Provider'
import { createController } from '../ProviderService'
import { TextMessage, TextResponse } from './TextMessage'
import { TextProvider } from './TextProvider'

interface PlivoDataParams {
    authId: string
    authToken: string
    phoneNumber: string
}

interface PlivoProviderParams extends ExternalProviderParams {
    data: PlivoDataParams
}

export default class PlivoTextProvider extends TextProvider {
    authId!: string
    authToken!: string
    phoneNumber!: string

    get apiKey(): string {
        return Buffer.from(`${this.authId}:${this.authToken}`).toString('base64')
    }

    async send(message: TextMessage): Promise<TextResponse> {
        const { from, to, text } = message
        const response = await fetch(`https://api.plivo.com/v1/Account/${this.authId}/Message/`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${this.apiKey}`,
                'Content-Type': 'application/json',
                'User-Agent': 'parcelvoy/v1 (+https://github.com/parcelvoy/platform)',
            },
            body: JSON.stringify({
                src: from,
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
            throw new Error(response.status === 401 ? await response.text() : (await response.json()).error)
        }
    }

    // https://www.plivo.com/docs/sms/use-cases/receive-sms/node
    parseInbound(inbound: any): TextMessage {
        return {
            to: inbound.To,
            from: inbound.From,
            text: inbound.Text,
        }
    }

    static controllers(): Router {
        const providerParams = ProviderSchema<PlivoProviderParams, PlivoDataParams>('plivoTextProviderParams', {
            type: 'object',
            required: ['authId', 'authToken', 'phoneNumber'],
            properties: {
                authId: { type: 'string' },
                authToken: { type: 'string' },
                phoneNumber: { type: 'string' },
            },
        })

        return createController('text', 'plivo', providerParams)
    }
}
