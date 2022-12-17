import Router from '@koa/router'
import { ExternalProviderParams, ProviderSchema } from '../Provider'
import { createController } from '../ProviderService'
import { InboundTextMessage, TextMessage, TextResponse } from './TextMessage'
import { TextProvider } from './TextProvider'

interface TwilioDataParams {
    accountSid: string
    authToken: string
    phoneNumber: string
}

interface TwilioProviderParams extends ExternalProviderParams {
    data: TwilioDataParams
}

export default class TwilioTextProvider extends TextProvider {
    accountSid!: string
    authToken!: string
    phoneNumber!: string

    get apiKey(): string {
        return Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')
    }

    async send(message: TextMessage): Promise<TextResponse> {
        const { to, text } = message
        const form = new FormData()
        form.append('From', this.phoneNumber)
        form.append('To', to)
        form.append('Body', text)

        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${this.apiKey}`,
                'User-Agent': 'parcelvoy/v1 (+https://github.com/parcelvoy/platform)',
            },
            body: form,
        })

        const responseBody = await response.json()
        if (response.ok) {
            return {
                message,
                success: true,
                response: responseBody.sid,
            }
        } else {
            throw new Error(`${response.status} - ${responseBody.message}`)
        }
    }

    // https://www.twilio.com/docs/messaging/guides/webhook-request
    parseInbound(inbound: any): InboundTextMessage {
        return {
            to: inbound.To,
            from: inbound.From,
            text: inbound.Body || '',
        }
    }

    static controllers(): Router {
        const providerParams = ProviderSchema<TwilioProviderParams, TwilioDataParams>('twilioTextProviderParams', {
            type: 'object',
            required: ['accountSid', 'authToken', 'phoneNumber'],
            properties: {
                accountSid: { type: 'string' },
                authToken: { type: 'string' },
                phoneNumber: { type: 'string' },
            },
        })

        return createController('text', 'twilio', providerParams)
    }
}
