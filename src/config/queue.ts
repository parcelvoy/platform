import Queue from '../queue'
import EmailJob from '../channels/email/EmailJob'
import EventPostJob from '../client/EventPostJob'
import TextJob from '../channels/text/TextJob'
import UserDeleteJob from '../users/UserDeleteJob'
import UserPatchJob from '../users/UserPatchJob'
import WebhookJob from '../channels/webhook/WebhookJob'
import { QueueConfig } from '../queue/Queue'
import JourneyDelayJob from '../journey/JourneyDelayJob'
import JourneyProcessJob from '../journey/JourneyProcessJob'
import TemplateSnapshotJob from '../render/TemplateSnapshotJob'
import CampaignTriggerJob from '../campaigns/CampaignTriggerJob'

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
    queue.register(CampaignTriggerJob)
    queue.register(TemplateSnapshotJob)
}

export default (config: QueueConfig) => {
    const queue = new Queue(config)
    loadJobs(queue)
    return queue
}
