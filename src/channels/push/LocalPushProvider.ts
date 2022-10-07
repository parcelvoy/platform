import { PushProvider } from './PushProvider'
import PushNotifications from 'node-pushnotifications'
import { Push, PushResponse } from './Push'
import PushError from './PushError'

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

// TODO: Should we allow for only setting up one or the other?
// TODO: Should we split Android / iOS providers in two? How will that
// affect the concept of providers?
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

        const invalidTokens = []
        for (const method of response) {
            if (method.failure <= 0) continue
            for (const push of method.message) {
                if (push.error) {
                    invalidTokens.push(push.regId)
                }
            }
        }

        if (response[0].failure > 0) {
            throw new PushError('local', response[0].message[0].errorMsg, invalidTokens)
        } else {
            return {
                push,
                success: true,
                response: response[0].message[0].messageId,
            }
        }
    }
}
