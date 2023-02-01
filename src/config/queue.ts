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
import ListPopulateJob from '../lists/ListPopulateJob'
import ListStatsJob from '../lists/ListStatsJob'
import ProcessListsJob from '../lists/ProcessListsJob'
import CampaignSendJob from '../campaigns/CampaignSendJob'

export type Queues = Record<number, Queue>

export const loadJobs = (queue: Queue) => {
    queue.register(CampaignTriggerJob)
    queue.register(CampaignSendJob)
    queue.register(EmailJob)
    queue.register(EventPostJob)
    queue.register(JourneyProcessJob)
    queue.register(JourneyDelayJob)
    queue.register(ListPopulateJob)
    queue.register(ListStatsJob)
    queue.register(ProcessListsJob)
    queue.register(TemplateSnapshotJob)
    queue.register(TextJob)
    queue.register(UserPatchJob)
    queue.register(UserDeleteJob)
    queue.register(WebhookJob)
}

export default (config: QueueConfig) => {
    const queue = new Queue(config)
    loadJobs(queue)
    return queue
}
