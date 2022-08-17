import { Job } from '../queue'
import { User } from '../models/User'
import App from '../app'
import { UserEvent } from '../sender/journey/UserEvent'
import { TextTemplate } from '../models/Template'
import { createEvent } from '../sender/journey/UserEventRepository'
import { MessageTrigger } from '../models/MessageTrigger'

export default class TextJob extends Job {
    static $name = 'text'

    static from(data: MessageTrigger): TextJob {
        return new this(data)
    }

    static async handler({ template_id, user_id, event_id }: MessageTrigger) {

        // Pull user & event details
        const user = await User.find(user_id)
        const event = await UserEvent.find(event_id)
        const template = await TextTemplate.find(template_id)

        // If user or template has been deleted since, abort
        if (!user || !template) return

        // Send and render email
        await App.main.texter.send(template, { user, event })

        // Create an event on the user about the text
        createEvent(user_id, 'text_sent', {
            // TODO: Add whatever other attributes
        })
    }
}
