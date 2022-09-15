import { PushProvider } from './PushProvider'
import PushNotifications from 'node-pushnotifications'
import { Push, PushResponse } from './Push'

interface APNParams {
    token: {
        key: string
        keyId: string
        teamId: string
    }
    production: boolean
}

interface FCMParams {
    id: string
}

export default class LocalPushProvider extends PushProvider {
    apn!: APNParams
    fcm!: FCMParams

    transport!: PushNotifications

    boot() {
        this.transport = new PushNotifications({
            apn: this.apn,
            gcm: this.fcm, // Uses historical name GCM, we'll use modern name
        })
    }

    async send(push: Push): Promise<PushResponse> {
        const { tokens, title, topic, body, custom } = push
        const response = await this.transport.send(typeof tokens === 'string' ? [tokens] : tokens, {
            title,
            topic,
            body,
            custom,
        })

        if (response[0].failure > 0) {
            const error = response[0].message[0].error ?? new Error(response[0].message[0].errorMsg)
            throw error
        } else {
            return {
                push,
                success: true,
                response: response[0].message[0].messageId,
            }
        }
    }
}
