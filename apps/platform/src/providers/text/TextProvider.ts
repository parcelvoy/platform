import Router from '@koa/router'
import { loadTextChannel } from '.'
import { toggleChannelSubscriptions } from '../../subscriptions/SubscriptionService'
import Provider, { ProviderGroup } from '../Provider'
import { InboundTextMessage, TextMessage, TextResponse } from './TextMessage'
import { Context } from 'koa'
import { getUserFromPhone } from '../../users/UserRepository'
import { getProject } from '../../projects/ProjectService'
import { EventPostJob } from '../../jobs'
import { SubscriptionState } from '../../subscriptions/Subscription'

export type TextProviderName = 'nexmo' | 'plivo' | 'twilio' | 'logger'

export abstract class TextProvider extends Provider {
    abstract send(message: TextMessage): Promise<TextResponse>
    abstract parseInbound(inbound: any): InboundTextMessage

    static get group() { return 'text' as ProviderGroup }

    static inbound(namespace: string) {
        const router = new Router<{ provider: Provider }>()

        const inbound = async (ctx: Context) => {
            const provider = ctx.state.provider

            // Load in the required components to properly parse the message
            const channel = await loadTextChannel(provider.id)
            const project = await getProject(provider.project_id)
            const message = channel?.provider.parseInbound(ctx.request.body)
            if (!channel || !project || !message) ctx.throw(404)

            // Find the user from the inbound text message
            const user = await getUserFromPhone(provider.project_id, message.from)
            if (!user) ctx.throw(404)

            // If we've made it this far, always respond with success so webhooks
            // don't double trigger
            ctx.status = 204

            // If the message includes the word STOP unsubscribe immediately
            if (message.text.toLowerCase().includes('stop')) {
                await toggleChannelSubscriptions(project.id, user, 'text')

            // If the message includes the word START, re-enable
            // SMS messages for the user
            } else if (message.text.toLowerCase().includes('start')) {
                await toggleChannelSubscriptions(project.id, user, 'text', SubscriptionState.subscribed)

            // If the message includes the word HELP, send the help message
            } else if (message.text.toLowerCase().includes('help') && project.text_help_message) {
                channel.provider.send({
                    to: message.from,
                    text: project.text_help_message,
                })

            // Otherwise create an event so journeys can trigger off of the message
            } else {
                await EventPostJob.from({
                    project_id: project.id,
                    event: {
                        name: 'text_inbound',
                        external_id: user.external_id,
                        anonymous_id: user.anonymous_id,
                        data: { message },
                    },
                }).queue()
            }
        }

        // Register for general `inbound` path but also deprecated `unsubscribe`
        router.post(`/${namespace}/inbound`, inbound)
        router.post(`/${namespace}/unsubscribe`, inbound)

        return router
    }
}
