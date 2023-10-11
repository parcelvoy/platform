import nodemailer from 'nodemailer'
import mg from 'nodemailer-sendgrid'
import EmailProvider from './EmailProvider'
import Router = require('@koa/router')
import Provider, { ExternalProviderParams, ProviderControllers, ProviderSchema, ProviderSetupMeta } from '../Provider'
import { createController } from '../ProviderService'
import { decodeHashid, encodeHashid } from '../../utilities'
import { getUserFromEmail } from '../../users/UserRepository'
import { getCampaign } from '../../campaigns/CampaignService'
import { trackMessageEvent } from '../../render/LinkService'
import App from '../../app'
import { Email } from './Email'

interface SendGridDataParams {
    api_key: string
}

type SendGridEmailProviderParams = Pick<SendGridEmailProvider, keyof ExternalProviderParams>

interface SendGridEvent {
    email: string
    event: string
    'X-Campaign-Id': string
}

export default class SendGridEmailProvider extends EmailProvider {
    api_key!: string

    static namespace = 'sendgrid'
    static meta = {
        name: 'SendGrid',
        url: 'https://sendgrid.com',
        icon: 'https://parcelvoy.com/providers/sendgrid.svg',
        paths: {
            'Webhook URL': `/${this.namespace}`,
        },
    }

    static schema = ProviderSchema<SendGridEmailProviderParams, SendGridDataParams>('SendGridProviderParams', {
        type: 'object',
        required: ['api_key'],
        properties: {
            api_key: {
                type: 'string',
                title: 'API Key',
            },
        },
        additionalProperties: false,
    })

    loadSetup(app: App): ProviderSetupMeta[] {
        return [{
            name: 'Webhook URL',
            value: `${app.env.apiBaseUrl}/providers/${encodeHashid(this.id)}/${(this.constructor as any).namespace}`,
        }]
    }

    boot() {
        this.transport = nodemailer.createTransport(mg({
            apiKey: this.api_key,
        }))
    }

    async send(message: Email): Promise<any> {
        return super.send({
            ...message,
            custom_args: message.headers,
            unique_args: message.headers,
        } as Email)
    }

    static controllers(): ProviderControllers {
        const admin = createController('email', this)

        const router = new Router<{ provider: Provider }>()
        router.post(`/${this.namespace}`, async ctx => {
            ctx.status = 204

            const provider = ctx.state.provider
            const events = ctx.request.body as SendGridEvent[]
            for (const event of events) {
                if (!['dropped', 'bounce', 'spamreport'].includes(event.event)) continue

                const type = event.event === 'dropped' || event.event === 'bounce'
                    ? 'bounced'
                    : 'complained'

                // Get values from webhook to identify user and campaign
                const campaignId = decodeHashid(event['X-Campaign-Id'])
                if (!event.email || !campaignId) return

                const projectId = provider.project_id
                const user = await getUserFromEmail(projectId, event.email)
                const campaign = await getCampaign(campaignId, projectId)
                if (!user || !campaign) return

                // Create an event and process the unsubscribe
                await trackMessageEvent({ user, campaign }, type, 'unsubscribe')
            }
        })

        return { admin, public: router }
    }
}
