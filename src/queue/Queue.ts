import Job, { EncodedJob } from './Job'
import QueueProvider from './QueueProvider'

export default class Queue {
    provider: QueueProvider
    jobs: Record<string, (data: any) => Promise<any>> = {}

    constructor(provider?: QueueProvider) {
        if (provider) {
            this.provider = provider
        } else {
            throw new Error('A valid queue must be defined!')
        }
        provider.load(this)
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
