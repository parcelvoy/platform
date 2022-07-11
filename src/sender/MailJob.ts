import { Job } from '../queue'
import { User } from '../models/User'
import App from '../app'

interface EmailTrigger {
    email: Email
    user: User
    event: any
}

interface Email {
    from: string
    to: string
    subject: string
    html: string
    text: string
    cc?: string
    bcc?: string
    replyTo?: string
}

export default class MailJob extends Job {
    static $name = 'email'

    static from(data: EmailTrigger): MailJob {
        // Should only store IDs
        return new this(data)
    }

    static async handler({ email, user, event }: EmailTrigger) {

        // Pull user details

        // Load event details

        // Create sender based on account

        // Send and render email
        App.main.mailer.send(email, { user, event }).then((thing) => {
            console.log(thing)
        })
        
        // Create an event on the user about the email
    }
}