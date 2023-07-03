import nodemailer from 'nodemailer'
import aws = require('@aws-sdk/client-ses')
import { AWSConfig } from '../../core/aws'
import EmailProvider from './EmailProvider'
import Router = require('@koa/router')
import Provider, { ExternalProviderParams, ProviderSetupMeta, ProviderControllers, ProviderSchema } from '../Provider'
import { createController } from '../ProviderService'
import { decodeHashid, encodeHashid, secondsAgo } from '../../utilities'
import { getUserFromEmail } from '../../users/UserRepository'
import { RequestError } from '../../core/errors'
import { getCampaign } from '../../campaigns/CampaignService'
import { trackMessageEvent } from '../../render/LinkService'
import type App from '../../app'

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
        icon: 'https://parcelvoy.com/providers/ses.svg',
        paths: {
            'Feedback URL': `/${this.namespace}`,
        },
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
                            accessKeyId: {
                                type: 'string',
                                title: 'Access Key ID',
                            },
                            secretAccessKey: {
                                type: 'string',
                                title: 'Secret Access Key',
                            },
                        },
                    },
                },
            },
        },
        additionalProperties: false,
    })

    loadSetup(app: App): ProviderSetupMeta[] {
        return [{
            name: 'Feedback URL',
            value: `${app.env.apiBaseUrl}/providers/${encodeHashid(this.id)}/${(this.constructor as any).namespace}`,
        }]
    }

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

        const admin = createController('email', this)

        const router = new Router<{ provider: Provider }>()
        router.post(`/${this.namespace}`, async ctx => {
            const body = ctx.get('Content-Type').includes('plain')
                ? JSON.parse(ctx.request.body)
                : ctx.request.body

            const { Type, Message, SubscribeURL, Timestamp } = body
            const timestamp = Date.parse(Timestamp)
            if (!Type || secondsAgo(timestamp) > 300) throw new RequestError('Unsupported SES Body')

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
        ) => (headers ?? []).find((item) => item.name.toLowerCase() === key.toLowerCase())?.value

        const json = JSON.parse(message) as Record<string, any>
        const { mail: { destination, headers } } = json
        const eventType = json.eventType ?? json.notificationType
        const email: string | undefined = destination[0]
        const subscriptionId = decodeHashid(getHeader(headers, 'X-Subscription-Id'))
        const campaignId = decodeHashid(getHeader(headers, 'X-Campaign-Id'))

        if (!email || !subscriptionId || !campaignId) return

        const user = await getUserFromEmail(projectId, email)
        if (!user) return

        const campaign = await getCampaign(campaignId, projectId)

        let type: 'bounced' | 'complained' | 'failed' = 'failed'
        let context: any
        let action: 'unsubscribe' | undefined
        if (eventType === 'Bounce') {
            type = 'bounced'
            context = json.bounce
            action = json.bounce.bounceType !== 'Transient' ? 'unsubscribe' : undefined
        }
        if (eventType === 'Complaint') {
            type = 'complained'
            context = json.complaint
            action = 'unsubscribe'
        }
        await trackMessageEvent({ user, campaign }, type, action, context)
    }
}
