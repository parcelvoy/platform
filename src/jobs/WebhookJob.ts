import { Job } from '../queue'
import { User } from '../models/User'
import App from '../app'
import { MessageTrigger } from '../models/MessageTrigger'
import { WebhookTemplate } from '../models/Template'
import { UserEvent } from '../journey/UserEvent'
import { createEvent } from '../journey/UserEventRepository'

export default class WebhookJob extends Job {
    static $name = 'webhook'

    static from(data: MessageTrigger): WebhookJob {
        return new this(data)
    }

    static async handler({ template_id, user_id, event_id }: MessageTrigger) {
        // Pull user & event details
        const user = await User.find(user_id)
        const event = await UserEvent.find(event_id)
        const template = await WebhookTemplate.find(template_id)

        // If user or template has been deleted since, abort
        if (!user || !template) return

        // Send and render webhook
        await App.main.webhooker.send(template, { user, event })

        // Create an event on the user about the email
        createEvent({
            project_id: user.project_id,
            user_id: user.id,
            name: 'webhook_sent',
            data: {
                // TODO: Add whatever other attributes
            },
        })
    }
}
