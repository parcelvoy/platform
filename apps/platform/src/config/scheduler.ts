import { cleanupExpiredRevokedTokens } from '../auth/TokenRepository'
import { addSeconds, subDays } from 'date-fns'
import nodeScheduler from 'node-schedule'
import App from '../app'
import CampaignTriggerJob from '../campaigns/CampaignTriggerJob'
import JourneyDelayJob from '../journey/JourneyDelayJob'
import ProcessListsJob from '../lists/ProcessListsJob'
import CampaignSendJob from '../campaigns/CampaignSendJob'
import Model from '../core/Model'
import { sleep, randomInt } from '../utilities'

export default async (app: App) => {
    const scheduler = new Scheduler(app)
    scheduler.schedule({
        rule: '* * * * *',
        callback: () => {
            app.queue.enqueue(JourneyDelayJob.from())
            app.queue.enqueue(CampaignTriggerJob.from())
            app.queue.enqueue(CampaignSendJob.from())
        },
        lockLength: 120,
    })
    scheduler.schedule({
        rule: '*/5 * * * *',
        callback: () => {
            app.queue.enqueue(ProcessListsJob.from())
        },
        lockLength: 360,
    })
    scheduler.schedule({
        rule: '0 * * * *',
        callback: () => {
            cleanupExpiredRevokedTokens(subDays(new Date(), 1))
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

class Scheduler {
    app: App
    constructor(app: App) {
        this.app = app
    }

    async schedule({ rule, name, callback, lockLength = 3600 }: Schedule) {
        nodeScheduler.scheduleJob(rule, async () => {
            const lock = await SchedulerLock.acquire({
                key: name ?? rule,
                owner: this.app.uuid,
                expiration: addSeconds(Date.now(), lockLength),
            })
            if (lock) {
                callback()
            }
        })
    }
}

class JobLock extends Model {
    key!: string
    owner!: string
    expiration!: Date
}

type LockParams = Pick<JobLock, 'key' | 'owner' | 'expiration'>

class SchedulerLock {

    /**
     * Attempt to get a lock for a given job so that it is not
     * executed multiple times.
     * @param job Partial<JobLock>
     * @returns Promise<boolean>
     */
    static async acquire({ key, owner, expiration }: LockParams) {
        let acquired = false
        try {

            // First try inserting a new lock for the given job
            await JobLock.insert({
                key,
                owner,
                expiration,
            })
            acquired = true
        } catch (error) {

            // Because of the unique index, duplicate locks for a job
            // will fail. In which case lets next check if the lock
            // has expired or if current owner, extend the lock
            acquired = await this.extendLock({ key, owner, expiration })
        }

        // Clean up any oddball pending jobs that are missed
        // Randomly run this job to reduce chance of deadlocks
        if (randomInt() < 10) {
            await JobLock.delete(qb => qb.where('expiration', '<=', new Date()))
        }

        return acquired
    }

    static async extendLock({ key, owner, expiration }: LockParams, retry = 3): Promise<boolean> {

        // If out of retries, fail
        if (retry <= 0) return false

        // Update job can deadlock. In case of deadlock, retry operation
        // up to three times total before failing.
        try {
            const updatedCount = await JobLock.update(
                qb =>
                    qb.where('key', key)
                        .where((subQb) => {
                            subQb.where('owner', owner)
                                .orWhere('expiration', '<=', new Date())
                        })
                        .orderBy('id'),
                {
                    owner,
                    expiration,
                },
            )
            return updatedCount > 0
        } catch {

            // Introduce jitter before trying again
            await sleep(randomInt(5, 20))
            return this.extendLock({ key, owner, expiration }, --retry)
        }
    }
}
