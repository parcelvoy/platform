import { InboundTextMessage, TextMessage, TextResponse } from './TextMessage'
import TextError from './TextError'
import { TextProvider } from './TextProvider'
import { ProviderParams, ProviderSchema } from '../Provider'
import Router from '@koa/router'
import { createController } from '../ProviderService'

interface NexmoDataParams {
    apiKey: string
    apiSecret: string
    phoneNumber: string
}

interface NexmoProviderParams extends ProviderParams {
    data: NexmoDataParams
}

export default class NexmoTextProvider extends TextProvider {
    apiKey!: string
    apiSecret!: string
    phoneNumber!: string

    async send(message: TextMessage): Promise<TextResponse> {
        const { to, text } = message
        const response = await fetch('https://rest.nexmo.com/sms/json', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'parcelvoy/v1 (+https://github.com/parcelvoy/platform)',
            },
            body: JSON.stringify({
                api_key: this.apiKey,
                api_secret: this.apiSecret,
                from: this.phoneNumber,
                to,
                text,
            }),
        })

        if (response.ok) {
            const responseBody = await response.json()
            const responseMessage = responseBody.messages[0]

            // Nexmo always returns 200 even for error
            if (responseMessage.status !== '0') {
                throw new TextError('nexmo', `Request failed with status: ${responseMessage.status}, error: ${responseMessage['error-text']}`)
            } else {
                return {
                    message,
                    success: true,
                    response: responseMessage['message-id'],
                }
            }
        } else {
            throw new TextError('nexmo', `Request failed with status ${response.status}`)
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

    static controllers(): Router {
        const providerParams = ProviderSchema<NexmoProviderParams, NexmoDataParams>('nexmoTextProviderParams', {
            type: 'object',
            required: ['apiKey', 'apiSecret', 'phoneNumber'],
            properties: {
                apiKey: { type: 'string' },
                apiSecret: { type: 'string' },
                phoneNumber: { type: 'string' },
            },
        })

        return createController('text', 'nexmo', providerParams)
    }
}
