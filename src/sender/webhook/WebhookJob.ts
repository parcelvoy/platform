import { Job } from '../../queue'
import { User } from '../../models/User'
import App from '../../app'
import { Webhook } from './Webhook'

interface EmailTrigger {
    webhook: Webhook
    user: User
    event: any
}

export default class WebhookJob extends Job {
    static $name = 'webhook'

    static from(data: EmailTrigger): WebhookJob {
        return new this(data)
    }

    static async handler({ webhook, user, event }: EmailTrigger) {
        // Pull user details

        // Load event details

        // Create sender based on account

        // Send and render email
        App.main.webhooker.send(webhook, { user, event }).then((thing) => {
            console.log(thing)
        })
        // Create an event on the user about the email
    }
}
