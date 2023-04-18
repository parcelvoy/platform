import App from '../app'
import { DriverConfig } from '../config/env'
import { logger } from '../config/logger'
import { LoggerConfig } from '../providers/LoggerProvider'
import Job, { EncodedJob } from './Job'
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
            throw new Error('A valid queue must be defined!')
        }
    }

    async dequeue(job: EncodedJob): Promise<boolean> {
        try {
            await this.started(job)
            await this.jobs[job.name](job.data, job)
            await this.completed(job)
        } catch (error: any) {
            this.errored(error, job)
        }
        return true
    }

    async enqueue(job: Job | EncodedJob): Promise<void> {
        logger.info(job instanceof Job ? job.toJSON() : job, 'queue:job:enqueued')
        return await this.provider.enqueue(job)
    }

    async enqueueBatch(jobs: EncodedJob[]): Promise<void> {
        logger.info({ count: jobs.length }, 'queue:job:enqueuedBatch')
        return await this.provider.enqueueBatch(jobs)
    }

    get batchSize() {
        return this.provider.batchSize
    }

    register(job: typeof Job) {
        this.jobs[job.$name] = job.handler
    }

    async started(job: EncodedJob) {
        // TODO: Do something about starting
        logger.info(job, 'queue:job:started')
    }

    async errored(error: Error, job?: EncodedJob) {
        logger.error({ error, job }, 'queue:job:errored')
        App.main.error.notify(error, job)
    }

    async completed(job: EncodedJob) {
        // TODO: Do something about completion
        logger.info(job, 'queue:job:completed')
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
}
