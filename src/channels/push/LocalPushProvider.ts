import { PushProvider } from './PushProvider'
import PushNotifications from 'node-pushnotifications'
import { Push, PushResponse } from './Push'
import PushError from './PushError'
import Router from '@koa/router'
import { ExternalProviderParams, ProviderSchema } from '../Provider'
import { createController } from '../ProviderService'

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

interface PushDataParams {
    apn?: APNParams
    fcm?: FCMParams
}

interface PushProviderParams extends ExternalProviderParams {
    data: PushDataParams
}

export default class LocalPushProvider extends PushProvider {
    apn?: APNParams
    fcm?: FCMParams

    transport!: PushNotifications

    static namespace = 'local'
    static meta = {
        name: 'Local',
        icon: 'https://parcelvoy.com/images/notification.svg',
    }

    static schema = ProviderSchema<PushProviderParams, PushDataParams>('localPushProviderParams', {
        type: 'object',
        properties: {
            apn: {
                type: 'object',
                nullable: true,
                required: ['production', 'token'],
                properties: {
                    production: {
                        type: 'boolean',
                    },
                    token: {
                        type: 'object',
                        required: ['key', 'keyId', 'teamId'],
                        properties: {
                            key: { type: 'string' },
                            keyId: { type: 'string' },
                            teamId: { type: 'string' },
                        },
                    },
                },
            },
            fcm: {
                type: 'object',
                nullable: true,
                required: ['id'],
                properties: {
                    id: { type: 'string' },
                },
            },
        },
        additionalProperties: false,
    })

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

    static controllers(): Router {
        return createController('push', this.namespace, this.schema)
    }
}
