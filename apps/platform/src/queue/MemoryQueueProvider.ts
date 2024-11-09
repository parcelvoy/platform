import { sleep, uuid } from '../utilities'
import Job from './Job'
import Queue, { QueueTypeConfig } from './Queue'
import QueueProvider from './QueueProvider'

export interface MemoryConfig extends QueueTypeConfig {
    driver: 'memory'
}

export default class MemoryQueueProvider implements QueueProvider {
    queue: Queue
    jobs: Record<string, Job> = {}
    backlog: string[] = []
    loop: NodeJS.Timeout | undefined
    batchSize = 1000 as const

    constructor(queue: Queue) {
        this.queue = queue
    }

    async enqueue(job: Job): Promise<void> {
        const jobId = job.options.jobId ?? uuid()
        if (!this.jobs[jobId]) {
            this.jobs[jobId] = job
            this.backlog.push(jobId)
        }
    }

    async enqueueBatch(jobs: Job[]): Promise<void> {
        for (const job of jobs) this.enqueue(job)
    }

    async delay(job: Job, milliseconds: number): Promise<void> {
        job.options.delay = milliseconds
        await this.enqueue(job)
    }

    start(): void {
        if (process.env.NODE_ENV === 'test') return
        if (this.loop) return
        this.process()
    }

    close(): void {
        clearTimeout(this.loop)
        this.loop = undefined
    }

    private async process() {
        let jobId = this.backlog.shift()
        while (jobId) {

            // If we have a jobId fetch job and dequeue
            if (jobId) {
                const job = this.jobs[jobId]
                if (job) await this.queue.dequeue(job)
                delete this.jobs[jobId]
            }

            jobId = this.backlog.shift()
        }
        await sleep(1000)
        await this.process()
    }
}
