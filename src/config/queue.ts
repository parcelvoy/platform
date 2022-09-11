import Queue from '../queue'
import EmailJob from '../channels/email/EmailJob'
import EventPostJob from '../client/EventPostJob'
import TextJob from '../channels/text/TextJob'
import UserDeleteJob from '../client/UserDeleteJob'
import UserPatchJob from '../client/UserPatchJob'
import WebhookJob from '../channels/webhook/WebhookJob'
import { QueueConfig } from '../queue/Queue'
import JourneyDelayJob from '../journey/JourneyDelayJob'
import JourneyProcessJob from '../journey/JourneyProcessJob'

export type Queues = Record<number, Queue>

export const loadJobs = (queue: Queue) => {
    queue.register(EmailJob)
    queue.register(TextJob)
    queue.register(WebhookJob)
    queue.register(UserPatchJob)
    queue.register(UserDeleteJob)
    queue.register(EventPostJob)
    queue.register(JourneyProcessJob)
    queue.register(JourneyDelayJob)
}

export default (config: QueueConfig) => {
    const queue = new Queue(config)
    loadJobs(queue)
    return queue
}
