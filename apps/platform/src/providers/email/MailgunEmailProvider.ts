import nodemailer from 'nodemailer'
import crypto from 'crypto'
import mg from 'nodemailer-mailgun-transport'
import EmailProvider from './EmailProvider'
import Router = require('@koa/router')
import Provider, { ExternalProviderParams, ProviderControllers, ProviderSchema, ProviderSetupMeta } from '../Provider'
import { createController } from '../ProviderService'
import { decodeHashid, encodeHashid } from '../../utilities'
import { getUserFromEmail } from '../../users/UserRepository'
import { RequestError } from '../../core/errors'
import { getCampaign } from '../../campaigns/CampaignService'
import { trackMessageEvent } from '../../render/LinkService'
import App from '../../app'

interface MailgunDataParams {
    api_key: string
    domain: string
    webhook_signing_key?: string
}

type MailgunEmailProviderParams = Pick<MailgunEmailProvider, keyof ExternalProviderParams>

export default class MailgunEmailProvider extends EmailProvider {
    api_key!: string
    domain!: string
    webhook_signing_key?: string

    static namespace = 'mailgun'
    static meta = {
        name: 'Mailgun',
        url: 'https://mailgun.com',
        icon: 'https://parcelvoy.com/providers/mailgun.svg',
        paths: {
            'Feedback URL': `/${this.namespace}`,
        },
    }

    static schema = ProviderSchema<MailgunEmailProviderParams, MailgunDataParams>('mailgunProviderParams', {
        type: 'object',
        required: ['api_key', 'domain'],
        properties: {
            api_key: {
                type: 'string',
                title: 'API Key',
            },
            domain: { type: 'string' },
            webhook_signing_key: {
                type: 'string',
                nullable: true,
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
        const auth = {
            auth: {
                api_key: this.api_key,
                domain: this.domain,
            },
        }
        this.transport = nodemailer.createTransport(mg(auth))
    }

    static controllers(): ProviderControllers {
        const admin = createController('email', this)

        const router = new Router<{ provider: Provider }>()
        router.post(`/${this.namespace}`, async ctx => {

            const provider = ctx.state.provider

            // Check message signature
            const signingKey = provider.data.webhook_signing_key
            if (signingKey) {
                const { timestamp, token, signature } = ctx.request.body
                const hash = crypto.createHmac('sha256', signingKey)
                    .update(timestamp.concat(token))
                    .digest('hex')
                if (hash !== signature) throw new RequestError('Invalid request.')
            }

            ctx.status = 204

            const { recipient: email, event, message: { headers } } = ctx.request.body['event-data']

            // If event is not a bounce or complaint, break
            if (!['failed', 'complained'].includes(event)) return
            const type = event === 'failed' ? 'bounced' : 'complained'

            // Get values from webhook to identify user and campaign
            const campaignId = decodeHashid(headers['X-Campaign-Id'])
            if (!email || !campaignId) return

            const projectId = provider.project_id
            const user = await getUserFromEmail(projectId, email)
            const campaign = await getCampaign(campaignId, projectId)
            if (!user || !campaign) return

            // Create an event and process the unsubscribe
            await trackMessageEvent({ user, campaign }, type, 'unsubscribe')
        })

        return { admin, public: router }
    }
}
