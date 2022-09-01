import Queue, { defaultQueueProvider } from '../queue'
import EmailJob from '../jobs/EmailJob'
import EventPostJob from '../jobs/EventPostJob'
import TextJob from '../jobs/TextJob'
import UserDeleteJob from '../jobs/UserDeleteJob'
import UserPatchJob from '../jobs/UserPatchJob'
import WebhookJob from '../jobs/WebhookJob'
import { Database } from './database'

export default async (db: Database) => {

    const provider = await defaultQueueProvider(db)
    const queue = new Queue(provider)

    queue.register(EmailJob)
    queue.register(TextJob)
    queue.register(WebhookJob)
    queue.register(UserPatchJob)
    queue.register(UserDeleteJob)
    queue.register(EventPostJob)

    return queue
}
