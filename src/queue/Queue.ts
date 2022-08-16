import Job, { EncodedJob } from './Job'
import SQSQueueProvider, { SQSConfig } from './SQSQueueProvider'
import MemoryQueueProvider, { MemoryConfig } from './MemoryQueueProvider'
import { LoggerConfig } from '../config/logger'
import QueueProvider from './QueueProvider'
import { DriverConfig } from '../config/env'
import EmailJob from '../jobs/EmailJob'
import UserPatchJob from '../jobs/UserPatchJob'
import UserDeleteJob from '../jobs/UserDeleteJob'
import EventPostJob from '../jobs/EventPostJob'

export type QueueDriver = 'sqs' | 'memory' | 'logger'
export type QueueConfig = SQSConfig | MemoryConfig | LoggerConfig

export interface QueueTypeConfig extends DriverConfig {
    driver: QueueDriver
}

export default class Queue {
    provider: QueueProvider
    jobs: Record<string, (data: any) => Promise<any>> = {}

    constructor(config?: QueueConfig) {
        if (config?.driver === 'sqs') {
            this.provider = new SQSQueueProvider(config, this)
        } else if (config?.driver === 'memory') {
            this.provider = new MemoryQueueProvider(this)
        } else {
            throw new Error('A valid queue must be defined!')
        }

        this.register(EmailJob)
        this.register(UserPatchJob)
        this.register(UserDeleteJob)
        this.register(EventPostJob)
    }

    async dequeue(job: EncodedJob): Promise<boolean> {
        await this.started(job)
        await this.jobs[job.name](job.data)
        await this.completed(job)
        return true
    }

    async enqueue(job: Job): Promise<void> {
        return await this.provider.enqueue(job)
    }

    register(job: typeof Job) {
        this.jobs[job.$name] = job.handler
    }

    async started(job: EncodedJob) {
        // TODO: Do something about starting
        console.log('started', job)
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async errored(job: EncodedJob, error: Error) {
        // TODO: Do something about failure
    }

    async completed(job: EncodedJob) {
        // TODO: Do something about completion
        console.log('completed', job)
    }

    async close() {
        this.provider.close()
    }
}
