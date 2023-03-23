import { DriverConfig } from '../config/env'
import { logger, LoggerConfig } from '../config/logger'
import Job, { EncodedJob } from './Job'
import MemoryQueueProvider, { MemoryConfig } from './MemoryQueueProvider'
import QueueProvider, { QueueProviderName } from './QueueProvider'
import RedisQueueProvider, { RedisConfig } from './RedisQueueProvider'
import SQSQueueProvider, { SQSConfig } from './SQSQueueProvider'

export type QueueConfig = SQSConfig | RedisConfig | MemoryConfig | LoggerConfig

export interface QueueTypeConfig extends DriverConfig {
    driver: QueueProviderName
}

export default class Queue {
    provider: QueueProvider
    jobs: Record<string, (data: any) => Promise<any>> = {}

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
        await this.started(job)
        await this.jobs[job.name](job.data)
        await this.completed(job)
        return true
    }

    async enqueue(job: Job): Promise<void> {
        logger.info(job.toJSON(), 'queue:job:enqueued')
        return await this.provider.enqueue(job)
    }

    register(job: typeof Job) {
        this.jobs[job.$name] = job.handler
    }

    async started(job: EncodedJob) {
        // TODO: Do something about starting
        logger.info(job, 'queue:job:started')
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async errored(job: EncodedJob, error: Error) {
        // TODO: Do something about failure
    }

    async completed(job: EncodedJob) {
        // TODO: Do something about completion
        logger.info(job, 'queue:job:completed')
    }

    async close() {
        this.provider.close()
    }
}
