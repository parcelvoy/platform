import App from '../../app'
import { encodeHashid } from '../../utilities'
import { ExternalProviderParams, ProviderControllers, ProviderSchema, ProviderSetupMeta } from '../Provider'
import { createController } from '../ProviderService'
import TextError, { UndeliverableTextError, UnsubscribeTextError } from './TextError'
import { InboundTextMessage, TextMessage, TextResponse } from './TextMessage'
import { TextProvider } from './TextProvider'

/**
 * https://www.twilio.com/docs/sms/quickstart/node
 */

interface TwilioDataParams {
    account_sid: string
    auth_token: string
    phone_number: string
}

interface TwilioProviderParams extends ExternalProviderParams {
    data: TwilioDataParams
}

export default class TwilioTextProvider extends TextProvider {
    account_sid!: string
    auth_token!: string
    phone_number!: string

    static namespace = 'twilio'
    static meta = {
        name: 'Twilio',
        description: '',
        url: 'https://twilio.com',
        icon: 'https://parcelvoy.com/providers/twilio.svg',
    }

    static schema = ProviderSchema<TwilioProviderParams, TwilioDataParams>('twilioTextProviderParams', {
        type: 'object',
        required: ['account_sid', 'auth_token', 'phone_number'],
        properties: {
            account_sid: {
                type: 'string',
                title: 'Account SID',
            },
            auth_token: { type: 'string' },
            phone_number: { type: 'string' },
        },
    })

    get apiKey(): string {
        return Buffer.from(`${this.account_sid}:${this.auth_token}`).toString('base64')
    }

    loadSetup(app: App): ProviderSetupMeta[] {
        return [{
            name: 'Inbound URL',
            value: `${app.env.apiBaseUrl}/providers/${encodeHashid(this.id)}/${(this.constructor as any).namespace}/inbound`,
        }]
    }

    async send(message: TextMessage): Promise<TextResponse> {
        const { to, text } = message
        const form = new URLSearchParams()
        form.append('From', this.phone_number)
        form.append('To', to)
        form.append('Body', text)

        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.account_sid}/Messages.json`, {
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
            if (responseBody.code === 21610) {
                // Unable to send because recipient has unsubscribed
                throw new UnsubscribeTextError(this.type, to, responseBody.message)
            } else if (responseBody.code === 21408) {
                // Unable to send because region is not enabled
                throw new UndeliverableTextError(this.type, to, responseBody.message)
            }
            throw new TextError(this.type, to, responseBody.message)
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

    static controllers(): ProviderControllers {
        const admin = createController('text', this)
        return { admin, public: this.inbound(this.namespace) }
    }
}
