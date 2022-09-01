import { TextMessage, TextResponse } from './TextMessage'
import TextError from './TextError'
import { TextProvider } from './TextProvider'

export default class NexmoTextProvider extends TextProvider {
    apiKey!: string
    apiSecret!: string

    async send(message: TextMessage): Promise<TextResponse> {
        const { from, to, text } = message
        const response = await fetch('https://rest.nexmo.com/sms/json', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'parcelvoy/v1 (+https://github.com/parcelvoy/platform)',
            },
            body: JSON.stringify({
                api_key: this.apiKey,
                api_secret: this.apiSecret,
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
}
