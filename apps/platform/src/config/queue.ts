import Queue from '../queue'
import EmailJob from '../providers/email/EmailJob'
import EventPostJob from '../client/EventPostJob'
import TextJob from '../providers/text/TextJob'
import UserDeleteJob from '../users/UserDeleteJob'
import UserPatchJob from '../users/UserPatchJob'
import WebhookJob from '../providers/webhook/WebhookJob'
import { QueueConfig } from '../queue/Queue'
import JourneyDelayJob from '../journey/JourneyDelayJob'
import JourneyProcessJob from '../journey/JourneyProcessJob'
import CampaignTriggerJob from '../campaigns/CampaignTriggerJob'
import ListPopulateJob from '../lists/ListPopulateJob'
import ListStatsJob from '../lists/ListStatsJob'
import ProcessListsJob from '../lists/ProcessListsJob'
import CampaignSendJob from '../campaigns/CampaignSendJob'
import CampaignStateJob from '../campaigns/CampaignStateJob'
import CampaignGenerateListJob from '../campaigns/CampaignGenerateListJob'
import CampaignInteractJob from '../campaigns/CampaignInteractJob'
import PushJob from '../providers/push/PushJob'
import UserAliasJob from '../users/UserAliasJob'
import UserDeviceJob from '../users/UserDeviceJob'

export type Queues = Record<number, Queue>

export const loadJobs = (queue: Queue) => {
    queue.register(CampaignGenerateListJob)
    queue.register(CampaignInteractJob)
    queue.register(CampaignSendJob)
    queue.register(CampaignStateJob)
    queue.register(CampaignTriggerJob)
    queue.register(EmailJob)
    queue.register(EventPostJob)
    queue.register(JourneyDelayJob)
    queue.register(JourneyProcessJob)
    queue.register(ListPopulateJob)
    queue.register(ListStatsJob)
    queue.register(ProcessListsJob)
    queue.register(PushJob)
    queue.register(TextJob)
    queue.register(UserAliasJob)
    queue.register(UserDeleteJob)
    queue.register(UserDeviceJob)
    queue.register(UserPatchJob)
    queue.register(WebhookJob)
}

export default (config: QueueConfig) => {
    return new Queue(config)
}

export const loadWorker = (config: QueueConfig) => {
    const queue = new Queue(config)
    loadJobs(queue)
    return queue
}
