import nodemailer from 'nodemailer'
import Provider, { ExternalProviderParams, ProviderControllers, ProviderSchema, ProviderSetupMeta } from '../Provider'
import { createController } from '../ProviderService'
import EmailProvider from './EmailProvider'
import { RestTransport } from '@sourceforgery/nodemailer-rest-transport'
import { decodeHashid, encodeHashid } from '../../utilities'
import { getUserFromEmail } from '../../users/UserRepository'
import { getCampaign } from '../../campaigns/CampaignService'
import { trackMessageEvent } from '../../render/LinkService'
import Router = require('@koa/router')
import App from '../../app'

export interface TachikomaDataParams {
    host: string
    port: number
    secure: boolean
}

type TachikomaEmailProviderParams = Pick<TachikomaEmailProvider, keyof ExternalProviderParams>

export default class TachikomaEmailProvider extends EmailProvider {
    host!: string
    port!: number
    secure!: boolean

    // declare data: JSONTransport

    static namespace = 'tachikoma'
    static meta = {
        name: 'Tachikoma',
        icon: 'https://parcelvoy.com/providers/webhook.svg',
        paths: {
            'Webhook URL': `/${this.namespace}`,
        },
    }

    static schema = ProviderSchema<TachikomaEmailProviderParams, TachikomaDataParams>('tachikomaProviderParams', {
        type: 'object',
        required: ['host', 'port', 'secure'],
        properties: {
            host: { type: 'string' },
            port: { type: 'number' },
            secure: { type: 'boolean' },
        },
        additionalProperties: false,
    })

    loadSetup(app: App): ProviderSetupMeta[] {
        return [{
            name: 'Webhook URL',
            value: `http://api:${app.env.port}/api/providers/${encodeHashid(this.id)}/${(this.constructor as any).namespace}`,
        }]
    }

    boot() {
        this.transport = nodemailer.createTransport(
            new RestTransport({
                host: this.host,
                port: this.port,
            },
            ),
        )
    }

    static controllers(): ProviderControllers {
        const admin = createController('email', this)
        const router = new Router<{ provider: Provider }>()
        router.post(`/${this.namespace}`, async ctx => {
            const provider = ctx.state.provider

            ctx.status = 204

            const { recipient: email, event, message: { headers } } = ctx.request.body['event-data']
            const campaignId = decodeHashid(headers['X-Campaign-Id'])
            if (!email || !campaignId) return
            const projectId = provider.project_id
            const user = await getUserFromEmail(projectId, email)
            const campaign = await getCampaign(campaignId, projectId)
            if (!user || !campaign) return

            const action = ['bounced', 'complained', 'unsubscribed']
                .includes(event)
                ? 'unsubscribe'
                : undefined

            await trackMessageEvent({ user, campaign }, event, action)
        })

        return { admin, public: router }
    }
}
