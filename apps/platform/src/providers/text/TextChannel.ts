import { CompiledText, TextTemplate } from '../../render/Template'
import { Variables } from '../../render'
import { TextProvider } from './TextProvider'
import { InboundTextMessage, TextResponse } from './TextMessage'
import { UserEvent } from '../../users/UserEvent'
import { UnsubscribeTextError } from './TextError'
import { unsubscribe } from '../../subscriptions/SubscriptionService'

const TEXT_SEGMENT_LENGTH = 160

export default class TextChannel {
    readonly provider: TextProvider
    constructor(provider?: TextProvider) {
        if (provider) {
            this.provider = provider
        } else {
            throw new Error('A valid text message driver must be defined!')
        }
    }

    async send(template: TextTemplate, variables: Variables): Promise<TextResponse> {
        if (!variables.user.phone) throw new Error('Unable to send a text message to a user with no phone number.')
        const message = await this.build(template, variables)
        try {
            return await this.provider.send({
                to: variables.user.phone,
                ...message,
            })
        } catch (error: any) {

            // If for some reason we are getting an unsubscribe error
            // force unsubscribe the user from this subscription type
            if (error instanceof UnsubscribeTextError) {
                await unsubscribe(variables.user.id, variables.context.subscription_id)
            }
            throw error
        }
    }

    async build(template: TextTemplate, variables: Variables): Promise<CompiledText> {

        // Compile the text template
        const compiled = template.compile(variables)

        // Check to see if its the first users message, if so include
        // the opt out message
        if (!variables.user.id) return compiled
        const hasReceivedOptOut = await UserEvent.exists(qb => qb.where({
            user_id: variables.user.id,
            name: 'text_sent',
        }))
        if (!hasReceivedOptOut && variables.project.text_opt_out_message) {
            compiled.text += `\n${variables.project.text_opt_out_message}`
        }

        return compiled
    }

    async segments(template: TextTemplate, variables: Variables): Promise<number> {
        const { text } = await this.build(template, variables)
        return Math.ceil(text.length / TEXT_SEGMENT_LENGTH)
    }

    parseInbound(body: any): InboundTextMessage {
        return this.provider.parseInbound(body)
    }
}
