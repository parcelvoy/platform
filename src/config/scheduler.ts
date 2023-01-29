import { cleanupExpiredRevokedTokens } from '../auth/TokenRepository'
import { subDays } from 'date-fns'
import schedule from 'node-schedule'
import App from '../app'
import CampaignTriggerJob from '../campaigns/CampaignTriggerJob'
import JourneyDelayJob from '../journey/JourneyDelayJob'
import ProcessListsJob from '../lists/ProcessListsJob'

export default async (app: App) => {
    schedule.scheduleJob('* * * * *', function() {
        app.queue.enqueue(JourneyDelayJob.from())
        app.queue.enqueue(CampaignTriggerJob.from())
    })
    schedule.scheduleJob('*/5 * * * *', function() {
        app.queue.enqueue(ProcessListsJob.from())
    })
    schedule.scheduleJob('0 * * * *', function() {
        cleanupExpiredRevokedTokens(subDays(new Date(), 1))
    })
    return schedule
}
