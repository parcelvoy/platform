import SQSQueueProvider, { SQSProviderConfig } from './SQSQueueProvider'
import Job, { EncodedJob } from './Job'

export interface QueueProvider {
    queue: Queue
    enqueue(job: Job): Promise<void>
    start(): void
    close(): void
}

export interface QueueTypeConfig {
    type: any
}

export type QueueConfig = SQSProviderConfig

export default class Queue {
    provider: QueueProvider
    jobs: Record<string, Job> = {}

    constructor(config: QueueConfig) {
        if (config.type === 'sqs') {
            this.provider = new SQSQueueProvider(config, this)
        }
        throw new Error('No queue provider setup')
    }

    async dequeue(job: EncodedJob): Promise<boolean> {
        await this.started(job)
        await this.jobs[job.name].handler(job.data)
        await this.completed(job)
        return true
    }

    async enqueue(job: Job): Promise<void> {
        return await this.provider.enqueue(job)
    }

    register(job: Job) {
        this.jobs[job.name] = job
    }

    async started(job: EncodedJob) {
        // TODO: Do something about starting
    }

    async errored(job: EncodedJob, error: Error) {
        // TODO: Do something about failure
    }

    async completed(job: EncodedJob) {
        // TODO: Do something about completion
    }
}
