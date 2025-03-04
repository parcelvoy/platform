import { MetricsTime, Queue as BullQueue, Worker, JobsOptions, DelayedError } from 'bullmq'
import { subMinutes } from 'date-fns'
import { logger } from '../config/logger'
import { batch } from '../utilities'
import { EncodedJob, JobPriority } from './Job'
import Queue, { QueueTypeConfig } from './Queue'
import QueueProvider, { MetricPeriod, QueueMetric } from './QueueProvider'
import { DefaultRedis, Redis, RedisConfig } from '../config/redis'

export interface RedisQueueConfig extends QueueTypeConfig, RedisConfig {
    driver: 'redis'
    concurrency: number
}

export default class RedisQueueProvider implements QueueProvider {

    redis: Redis
    queue: Queue
    bull: BullQueue
    worker?: Worker
    concurrency: number
    batchSize = 50 as const
    queueName = 'parcelvoy' as const

    constructor({ concurrency, ...config }: RedisQueueConfig, queue: Queue) {
        this.queue = queue
        this.concurrency = concurrency ?? 10
        this.redis = DefaultRedis(config, {
            maxRetriesPerRequest: null,
        })
        this.bull = new BullQueue(this.queueName, {
            connection: this.redis,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000,
                },
            },
        })
    }

    async enqueue(job: EncodedJob): Promise<void> {
        try {
            const { name, data, opts } = this.adaptJob(job)
            await this.bull.add(name, data, opts)
        } catch (error) {
            logger.error(error, 'redis:error:enqueue')
        }
    }

    async enqueueBatch(jobs: EncodedJob[]): Promise<void> {
        for (const part of batch(jobs, this.batchSize)) {
            await this.bull.addBulk(part.map(item => this.adaptJob(item)))
        }
    }

    async delay(job: EncodedJob, milliseconds: number): Promise<void> {

        // If we are missing required fields, just enqueue the job manually
        if (!job.options.jobId || !job.token) {
            job.options.delay = milliseconds
            await this.enqueue(job)
            return
        }

        // If we are able to fetch the job, properly move it to delayed
        const bullJob = await this.bull.getJob(job.options.jobId)
        await bullJob?.moveToDelayed(Date.now() + milliseconds, job.token)

        // Special error so job stays in queue instead of being removed
        throw new DelayedError()
    }

    private adaptJob(job: EncodedJob): { name: string, data: any, opts: JobsOptions | undefined } {
        return {
            name: job.name,
            data: job,
            opts: {
                removeOnComplete: true,
                removeOnFail: {
                    count: 50,
                    age: 24 * 3600, // keep up to 24 hours
                },
                ...job.options,
            },
        }
    }

    start(): void {
        this.worker = new Worker('parcelvoy', async (job, token) => {
            await this.queue.dequeue({
                ...job.data,
                options: {
                    ...job.data.options,
                    jobId: job.id,
                },
                state: {
                    attemptsMade: job.attemptsMade,
                },
                token,
            })
        }, {
            connection: this.redis,
            concurrency: this.concurrency,
            metrics: {
                maxDataPoints: MetricsTime.TWO_WEEKS,
            },
        })

        this.worker.on('failed', (job, error) => {
            this.queue.errored(error, job?.data as EncodedJob)
        })

        this.worker.on('error', error => {
            this.queue.errored(error)
        })
    }

    close(): void {
        this.bull.close()
        this.worker?.close()
    }

    async metrics(period: MetricPeriod): Promise<QueueMetric> {
        const waiting = await this.bull.getWaitingCount()
        const priorities = await this.bull.getCountsPerPriority([
            JobPriority.high,
            JobPriority.low,
        ])
        const completed = await this.bull.getMetrics('completed')
        const data = completed.data
            .slice(0, period)
            .map((count, index) => ({
                date: subMinutes(Date.now(), index),
                count: Math.floor(count),
            }))
        data.reverse()
        return {
            data,
            waiting: waiting
                + priorities[JobPriority.high]
                + priorities[JobPriority.low],
        }
    }

    async failed() {
        return this.bull.getFailed()
    }
}
