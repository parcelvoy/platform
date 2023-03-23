import nodemailer from 'nodemailer'
import aws = require('@aws-sdk/client-ses')
import { AWSConfig } from '../../core/aws'
import EmailProvider from './EmailProvider'
import Router = require('@koa/router')
import Provider, { ExternalProviderParams, ProviderControllers, ProviderSchema } from '../Provider'
import { createController } from '../ProviderService'
import { createEvent } from '../../users/UserEventRepository'
import { secondsAgo } from '../../utilities'
import { getUserFromEmail } from '../../users/UserRepository'
import { unsubscribe } from '../../subscriptions/SubscriptionService'
import { RequestError } from '../../core/errors'

interface SESDataParams {
    config: AWSConfig
}

type SESEmailProviderParams = Pick<SESEmailProvider, keyof ExternalProviderParams>

export default class SESEmailProvider extends EmailProvider {
    config!: AWSConfig

    static namespace = 'ses'
    static meta = {
        name: 'Amazon SES',
        url: 'https://aws.amazon.com/ses',
        icon: 'https://parcelvoy.com/images/ses.svg',
    }

    static schema = ProviderSchema<SESEmailProviderParams, SESDataParams>('sesProviderParams', {
        type: 'object',
        required: ['config'],
        properties: {
            config: {
                type: 'object',
                required: ['region', 'credentials'],
                properties: {
                    region: { type: 'string' },
                    credentials: {
                        type: 'object',
                        required: ['accessKeyId', 'secretAccessKey'],
                        properties: {
                            accessKeyId: { type: 'string' },
                            secretAccessKey: { type: 'string' },
                        },
                    },
                },
            },
        },
        additionalProperties: false,
    })

    boot() {
        const ses = new aws.SES({
            region: this.config.region,
            credentials: this.config.credentials,
        })

        this.transport = nodemailer.createTransport({
            SES: {
                ses, aws,
            },
        })
    }

    static controllers(): ProviderControllers {
        const admin = createController('email', this.namespace, this.schema)

        const router = new Router<{ provider: Provider }>()
        router.post(`/${this.namespace}`, async ctx => {
            const { Type, Message, SubscribeURL, Timestamp } = ctx.request.body
            const timestamp = Date.parse(Timestamp)
            if (!Type || secondsAgo(timestamp) > 30) throw new RequestError('Unsupported SES Body')

            ctx.status = 204

            // If we are getting an SNS topic confirmation, ping back
            if (Type === 'SubscriptionConfirmation' && SubscribeURL) {
                await fetch(SubscribeURL)
            } else if (Type === 'Notification' && Message) {
                await this.rejection(ctx.state.provider.project_id, Message)
            }
        })

        return { admin, public: router }
    }

    static async rejection(projectId: number, message: string) {
        const getHeader = (
            headers: Array<{ name: string, value: string }>,
            key: string,
        ) => (headers ?? []).find((item) => item.name === key)?.value

        const json = JSON.parse(message) as Record<string, any>
        const { notificationType, mail: { destination, headers } } = json
        const email: string | undefined = destination[0]
        const subscriptionId = getHeader(headers, 'X-Subscription-Id')
        const campaignId = getHeader(headers, 'X-Campaign-Id')

        if (!email || !subscriptionId) return

        const user = await getUserFromEmail(projectId, email)
        if (!user) return

        const name = notificationType === 'Bounce' ? 'bounce' : 'complaint'
        await createEvent(user, {
            name,
            data: {
                subscription_id: subscriptionId,
                campaign_id: campaignId,
            },
        })

        if (name === 'bounce' && subscriptionId) {
            await unsubscribe(user.id, parseInt(subscriptionId))
        }
    }
}
