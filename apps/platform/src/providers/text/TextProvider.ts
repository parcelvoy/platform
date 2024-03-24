import Router from '@koa/router'
import { loadTextChannel } from '.'
import { unsubscribeSms } from '../../subscriptions/SubscriptionService'
import Provider, { ProviderGroup } from '../Provider'
import { InboundTextMessage, TextMessage, TextResponse } from './TextMessage'

export type TextProviderName = 'nexmo' | 'plivo' | 'twilio' | 'logger'

export abstract class TextProvider extends Provider {
    abstract send(message: TextMessage): Promise<TextResponse>
    abstract parseInbound(inbound: any): InboundTextMessage

    static get group() { return 'text' as ProviderGroup }

    static unsubscribe(namespace: string) {
        const router = new Router<{ provider: Provider }>()
        router.post(`/${namespace}/unsubscribe`, async ctx => {
            const channel = await loadTextChannel(ctx.state.provider.id)
            if (!channel) {
                ctx.status = 404
                return
            }

            // Always return with positive status code
            ctx.status = 204

            await unsubscribeSms(channel.provider, ctx.request.body)
        })
        return router
    }
}
