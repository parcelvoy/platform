import { TextMessage, TextProvider, TextResponse, TextTypeConfig } from './TextSender'

export interface TwilioConfig extends TextTypeConfig {
    driver: 'twilio'
    accountSid: string
    authToken: string
}

export default class TwilioTextProvider implements TextProvider {
    accountSid: string
    apiKey: string

    constructor ({ accountSid, authToken }: TwilioConfig) {
        this.accountSid = accountSid
        this.apiKey = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
    }

    async send (message: TextMessage): Promise<TextResponse> {
        const { from, to, text } = message
        const form = new FormData()
        form.append('From', from)
        form.append('To', to)
        form.append('Body', text)

        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${this.apiKey}`,
                'User-Agent': 'parcelvoy/v1 (+https://github.com/parcelvoy/platform)'
            },
            body: form
        })

        const responseBody = await response.json()
        if (response.ok) {
            return {
                message,
                success: true,
                response: responseBody.sid
            }
        } else {
            throw new Error(`${response.status} - ${responseBody.message}`)
        }
    }
}
