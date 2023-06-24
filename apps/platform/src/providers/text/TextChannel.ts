import { CompiledText, TextTemplate } from '../../render/Template'
import { Variables } from '../../render'
import { TextProvider } from './TextProvider'
import { InboundTextMessage } from './TextMessage'
import { UserEvent } from '../../users/UserEvent'

export default class TextChannel {
    readonly provider: TextProvider
    constructor(provider?: TextProvider) {
        if (provider) {
            this.provider = provider
        } else {
            throw new Error('A valid text message driver must be defined!')
        }
    }

    async send(template: TextTemplate, variables: Variables) {
        if (!variables.user.phone) throw new Error('Unable to send a text message to a user with no phone number.')
        const message = await this.build(template, variables)
        await this.provider.send({
            to: variables.user.phone,
            ...message,
        })
    }

    async build(template: TextTemplate, variables: Variables): Promise<CompiledText> {

        // Compile the text template
        const compiled = template.compile(variables)

        // Check to see if its the first users message, if so include
        // the opt out message
        const hasReceivedOptOut = await UserEvent.exists(qb => qb.where({
            user_id: variables.user.id,
            name: 'text_sent',
        }))
        if (!hasReceivedOptOut && variables.context.project.text_opt_out_message) {
            compiled.text += `\n${variables.context.project.text_opt_out_message}`
        }

        return compiled
    }

    parseInbound(body: any): InboundTextMessage {
        return this.provider.parseInbound(body)
    }
}
