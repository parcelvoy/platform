import { cleanupExpiredRevokedTokens } from '../auth/TokenRepository'
import { subDays, subHours } from 'date-fns'
import nodeScheduler from 'node-schedule'
import App from '../app'
import ProcessCampaignsJob from '../campaigns/ProcessCampaignsJob'
import JourneyDelayJob from '../journey/JourneyDelayJob'
import ProcessListsJob from '../lists/ProcessListsJob'
import CampaignStateJob from '../campaigns/CampaignStateJob'
import UserSchemaSyncJob from '../schema/UserSchemaSyncJob'
import UpdateJourneysJob from '../journey/UpdateJourneysJob'
import ScheduledEntranceOrchestratorJob from '../journey/ScheduledEntranceOrchestratorJob'
import { acquireLock } from '../core/Lock'

export default (app: App) => {
    const scheduler = new Scheduler(app)
    scheduler.schedule({
        rule: '* * * * *',
        callback: () => {
            JourneyDelayJob.enqueueActive(app)
            app.queue.enqueue(ProcessCampaignsJob.from())
            app.queue.enqueue(CampaignStateJob.from())
            app.queue.enqueue(ScheduledEntranceOrchestratorJob.from())
        },
        lockLength: 120,
    })
    scheduler.schedule({
        rule: '0 * * * *',
        callback: () => {
            cleanupExpiredRevokedTokens(subDays(new Date(), 1))
            app.queue.enqueue(UserSchemaSyncJob.from({
                delta: subHours(new Date(), 1),
            }))
            app.queue.enqueue(UpdateJourneysJob.from())
        },
    })
    scheduler.schedule({
        rule: '0 0,12 * * *',
        callback: () => {
            app.queue.enqueue(ProcessListsJob.from())
        },
    })
    return scheduler
}

interface Schedule {
    rule: string
    name?: string
    callback: () => void
    lockLength?: number
}

export class Scheduler {
    app: App
    constructor(app: App) {
        this.app = app
    }

    async schedule({ rule, name, callback, lockLength = 3600 }: Schedule) {
        nodeScheduler.scheduleJob(rule, async () => {
            const lock = await acquireLock({
                key: name ?? rule,
                owner: this.app.uuid,
                timeout: lockLength,
            })
            if (lock) {
                callback()
            }
        })
    }

    async close() {
        return await nodeScheduler.gracefulShutdown()
    }
}
