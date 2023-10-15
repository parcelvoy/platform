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
import UserSchemaSyncJob from '../schema/UserSchemaSyncJob'
import UserDeviceJob from '../users/UserDeviceJob'
import JourneyStatsJob from '../journey/JourneyStatsJob'
import UpdateJourneysJob from '../journey/UpdateJourneysJob'
import ScheduledEntranceJob from '../journey/ScheduledEntranceJob'
import ScheduledEntranceOrchestratorJob from '../journey/ScheduledEntranceOrchestratorJob'

export const jobs = [
    CampaignGenerateListJob,
    CampaignInteractJob,
    CampaignSendJob,
    CampaignStateJob,
    CampaignTriggerJob,
    EmailJob,
    EventPostJob,
    JourneyDelayJob,
    JourneyProcessJob,
    JourneyStatsJob,
    ListPopulateJob,
    ListStatsJob,
    ProcessListsJob,
    PushJob,
    ScheduledEntranceJob,
    ScheduledEntranceOrchestratorJob,
    TextJob,
    UpdateJourneysJob,
    UserAliasJob,
    UserDeleteJob,
    UserDeviceJob,
    UserPatchJob,
    UserSchemaSyncJob,
    WebhookJob,
]

export const loadJobs = (queue: Queue) => {
    for (const job of jobs) {
        queue.register(job)
    }
}

export default (config: QueueConfig) => {
    return new Queue(config)
}
