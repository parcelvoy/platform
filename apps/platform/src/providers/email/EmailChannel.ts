import App from '../../app'
import { Variables } from '../../render'
import { EmailTemplate } from '../../render/Template'
import { unsubscribeEmailLink } from '../../subscriptions/SubscriptionService'
import { encodeHashid, pick } from '../../utilities'
import { Email } from './Email'
import EmailProvider from './EmailProvider'

export default class EmailChannel {
    readonly provider: EmailProvider
    constructor(provider?: EmailProvider) {
        if (provider) {
            this.provider = provider
            this.provider.boot?.()
        } else {
            throw new Error('A valid mailer must be defined!')
        }
    }

    async send(template: EmailTemplate, variables: Variables) {
        if (!variables.user.email) throw new Error('Unable to send a message to a user with no email.')

        // TODO: Explore caching the Handlebars template
        // before passing in variables for better performance
        const compiled = template.compile(variables)
        const email: Email = {
            ...compiled,
            to: variables.user.email,
            headers: {
                'X-Campaign-Id': encodeHashid(variables.context.campaign_id),
                'X-Subscription-Id': encodeHashid(variables.context.subscription_id),
            },
            list: {
                unsubscribe: unsubscribeEmailLink({
                    userId: variables.user.id,
                    campaignId: variables.context.campaign_id,
                    referenceId: variables.context.reference_id,
                }),
            },
        }
        const result = await this.provider.send(email)
        return {
            ...pick(result, [
                'messageId',
                'messageSize',
                'messageTime',
                'envelope',
                'accepted',
                'rejected',
                'pending',
                'response',
            ]),
            message: App.main.env.config.logCompiledMessage ? compiled : undefined,
        }
    }

    async verify(): Promise<boolean> {
        await this.provider.verify()
        return true
    }
}
