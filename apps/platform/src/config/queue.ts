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
import ListPopulateJob from '../lists/ListPopulateJob'
import ListStatsJob from '../lists/ListStatsJob'
import ProcessListsJob from '../lists/ProcessListsJob'
import ProcessCampaignsJob from '../campaigns/ProcessCampaignsJob'
import CampaignEnqueueSendJob from '../campaigns/CampaignEnqueueSendsJob'
import CampaignStateJob from '../campaigns/CampaignStateJob'
import CampaignGenerateListJob from '../campaigns/CampaignGenerateListJob'
import CampaignInteractJob from '../campaigns/CampaignInteractJob'
import CampaignTriggerSendJob from '../campaigns/CampaignTriggerSendJob'
import PushJob from '../providers/push/PushJob'
import UserAliasJob from '../users/UserAliasJob'
import UserSchemaSyncJob from '../schema/UserSchemaSyncJob'
import UserDeviceJob from '../users/UserDeviceJob'
import JourneyStatsJob from '../journey/JourneyStatsJob'
import UpdateJourneysJob from '../journey/UpdateJourneysJob'
import ScheduledEntranceJob from '../journey/ScheduledEntranceJob'
import ScheduledEntranceOrchestratorJob from '../journey/ScheduledEntranceOrchestratorJob'
import ListRefreshJob from '../lists/ListRefreshJob'
import ListEvaluateUserJob from '../lists/ListEvaluateUserJob'
import UserListMatchJob from '../lists/UserListMatchJob'
import CampaignAbortJob from '../campaigns/CampaignAbortJob'

export const jobs = [
    CampaignAbortJob,
    CampaignGenerateListJob,
    CampaignEnqueueSendJob,
    CampaignInteractJob,
    CampaignStateJob,
    CampaignTriggerSendJob,
    EmailJob,
    EventPostJob,
    JourneyDelayJob,
    JourneyProcessJob,
    JourneyStatsJob,
    ListEvaluateUserJob,
    ListRefreshJob,
    ListPopulateJob,
    ListStatsJob,
    ProcessListsJob,
    ProcessCampaignsJob,
    PushJob,
    ScheduledEntranceJob,
    ScheduledEntranceOrchestratorJob,
    TextJob,
    UpdateJourneysJob,
    UserAliasJob,
    UserDeleteJob,
    UserDeviceJob,
    UserListMatchJob,
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
