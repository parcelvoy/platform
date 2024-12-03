import { PushProvider } from './PushProvider'
import PushNotifications from 'node-pushnotifications'
import { Push, PushResponse } from './Push'
import PushError from './PushError'
import { ExternalProviderParams, ProviderControllers, ProviderSchema } from '../Provider'
import { createController } from '../ProviderService'

interface APNParams {
    token: {
        key: string
        keyId: string
        teamId: string
    }
    production: boolean
    bundleId: string
}

interface FCMParams {
    appName: string
    serviceAccountKey: {
        projectId: string
        privateKey: string
        clientEmail: string
    }
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
        name: 'APN & Firebase',
        icon: 'https://parcelvoy.com/providers/notification.svg',
    }

    static schema = ProviderSchema<PushProviderParams, PushDataParams>('localPushProviderParams', {
        type: 'object',
        properties: {
            apn: {
                type: 'object',
                nullable: true,
                required: ['production', 'token'],
                title: 'APN',
                description: 'Settings for Apple Push Notifications to send messages to iOS devices.',
                properties: {
                    production: {
                        type: 'boolean',
                        description: 'Leave unchecked if you are wanting to send to sandbox devices only.',
                    },
                    token: {
                        type: 'object',
                        required: ['key', 'keyId', 'teamId'],
                        properties: {
                            key: {
                                type: 'string',
                                minLength: 80,
                            },
                            keyId: {
                                type: 'string',
                                title: 'Key ID',
                            },
                            teamId: {
                                type: 'string',
                                title: 'Team ID',
                            },
                        },
                    },
                    bundleId: {
                        type: 'string',
                        title: 'Bundle ID',
                    },
                },
            },
            fcm: {
                type: 'object',
                nullable: true,
                required: ['appName', 'serviceAccountKey'],
                title: 'FCM',
                description: 'Settings for Firebase Cloud Messaging to send messages to Android devices.',
                properties: {
                    appName: {
                        type: 'string',
                        title: 'App Name',
                    },
                    serviceAccountKey: {
                        type: 'object',
                        required: ['projectId', 'privateKey', 'clientEmail'],
                        properties: {
                            projectId: {
                                type: 'string',
                                title: 'Project ID',
                            },
                            privateKey: {
                                type: 'string',
                                title: 'Private Key',
                                minLength: 80,
                            },
                            clientEmail: {
                                type: 'string',
                                title: 'Client Email',
                            },
                        },
                    },
                },
            },
        },
        additionalProperties: false,
    })

    boot() {
        this.transport = new PushNotifications({
            apn: this.apn,
            fcm: {
                appName: this.fcm?.appName,
                serviceAccountKey: {
                    projectId: this.fcm?.serviceAccountKey.projectId,
                    privateKey: this.fcm?.serviceAccountKey.privateKey?.replace(/\\n/g, '\n'),
                    clientEmail: this.fcm?.serviceAccountKey.clientEmail,
                },
            },
        } as unknown as PushNotifications.Settings) // Types are not up to date
    }

    async send(push: Push): Promise<PushResponse> {
        const { tokens, title, body, custom } = push
        const response = await this.transport.send(typeof tokens === 'string' ? [tokens] : tokens, {
            title,
            topic: this.apn?.bundleId,
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

        if (response[0].failure > 0 && response[0].success <= 0) {
            throw new PushError('local', response[0].message[0].errorMsg, invalidTokens)
        } else {
            return {
                push,
                success: true,
                response: response[0].message[0].messageId,
                invalidTokens,
            }
        }
    }

    static controllers(): ProviderControllers {
        return { admin: createController('push', this) }
    }
}
