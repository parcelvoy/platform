import Queue from '../queue'
import EmailJob from '../jobs/EmailJob'
import EventPostJob from '../jobs/EventPostJob'
import TextJob from '../jobs/TextJob'
import UserDeleteJob from '../jobs/UserDeleteJob'
import UserPatchJob from '../jobs/UserPatchJob'
import WebhookJob from '../jobs/WebhookJob'

export default (queue: Queue) => {

    queue.register(EmailJob)
    queue.register(TextJob)
    queue.register(WebhookJob)
    queue.register(UserPatchJob)
    queue.register(UserDeleteJob)
    queue.register(EventPostJob)
}
