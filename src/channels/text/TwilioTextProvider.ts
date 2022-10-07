import { TextMessage, TextResponse } from './TextMessage'
import { TextProvider } from './TextProvider'

export default class TwilioTextProvider extends TextProvider {
    accountSid!: string
    authToken!: string

    get apiKey(): string {
        return Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')
    }

    async send(message: TextMessage): Promise<TextResponse> {
        const { from, to, text } = message
        const form = new FormData()
        form.append('From', from)
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
    parseInbound(inbound: any): TextMessage {
        return {
            to: inbound.To,
            from: inbound.From,
            text: inbound.Body || '',
        }
    }
}
