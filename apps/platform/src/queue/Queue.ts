import App from '../app'
import { DriverConfig } from '../config/env'
import { logger } from '../config/logger'
import { LoggerConfig } from '../providers/LoggerProvider'
import Job, { EncodedJob, JobError } from './Job'
import MemoryQueueProvider, { MemoryConfig } from './MemoryQueueProvider'
import QueueProvider, { MetricPeriod, QueueMetric, QueueProviderName } from './QueueProvider'
import RedisQueueProvider, { RedisQueueConfig } from './RedisQueueProvider'
import SQSQueueProvider, { SQSConfig } from './SQSQueueProvider'

export type QueueConfig = SQSConfig | RedisQueueConfig | MemoryConfig | LoggerConfig

export interface QueueTypeConfig extends DriverConfig {
    driver: QueueProviderName
}

export default class Queue {
    provider: QueueProvider
    jobs: Record<string, (data: any, raw?: EncodedJob) => Promise<any>> = {}

    constructor(config?: QueueConfig) {
        if (config?.driver === 'sqs') {
            this.provider = new SQSQueueProvider(config, this)
        } else if (config?.driver === 'redis') {
            this.provider = new RedisQueueProvider(config, this)
        } else if (config?.driver === 'memory') {
            this.provider = new MemoryQueueProvider(this)
        } else {
            throw new Error('A valid queue driver must be set!')
        }
    }

    async dequeue(job: EncodedJob): Promise<boolean> {
        const handler = this.jobs[job.name]
        if (!handler) {
            App.main.error.notify(new Error(`No handler found for job: ${job.name}`))
        }

        const start = Date.now()
        await this.started(job)
        await handler(job.data, job)
        await this.completed(job, Date.now() - start)
        return true
    }

    async enqueue(job: Job | EncodedJob): Promise<void> {
        logger.trace(job instanceof Job ? job.toJSON() : job, 'queue:job:enqueued')
        await this.provider.enqueue(job)

        // Increment stats
        await App.main.stats.increment(job.name)
    }

    async enqueueBatch(jobs: EncodedJob[]): Promise<void> {
        logger.trace({ count: jobs.length }, 'queue:job:enqueuedBatch')
        await this.provider.enqueueBatch(jobs)

        // Increment stats
        await App.main.stats.increment(jobs.map(job => job.name))
    }

    async delay(job: EncodedJob, milliseconds: number) {
        await this.provider.delay(job, milliseconds)
    }

    get batchSize() {
        return this.provider.batchSize
    }

    register(job: typeof Job) {
        this.jobs[job.$name] = job.handler
    }

    async started(job: EncodedJob) {
        logger.trace(job, 'queue:job:started')
    }

    async errored(error: Error, job?: EncodedJob) {
        if (error instanceof JobError) return
        logger.error({ error, stacktrace: error.stack, job }, 'queue:job:errored')
        App.main.error.notify(error, job)
    }

    async completed(job: EncodedJob, duration: number) {
        logger.trace(job, 'queue:job:completed')

        await App.main.stats.increment(`${job.name}:completed`)
        await App.main.stats.increment(`${job.name}:duration`, duration)
    }

    async start() {
        this.provider.start()
    }

    async close() {
        this.provider.close()
    }

    async metrics(period = MetricPeriod.FOUR_HOURS): Promise<QueueMetric | undefined> {
        return await this.provider.metrics?.(period)
    }

    async failed(): Promise<QueueMetric | undefined> {
        return await this.provider.failed?.()
    }
}
