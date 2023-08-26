import { sleep } from '../utilities'
import Job from './Job'
import Queue, { QueueTypeConfig } from './Queue'
import QueueProvider from './QueueProvider'

export interface MemoryConfig extends QueueTypeConfig {
    driver: 'memory'
}

export default class MemoryQueueProvider implements QueueProvider {
    queue: Queue
    backlog: Job[] = []
    loop: NodeJS.Timeout | undefined
    batchSize = 1000 as const

    constructor(queue: Queue) {
        this.queue = queue
    }

    async enqueue(job: Job): Promise<void> {
        this.backlog.push(job)
    }

    async enqueueBatch(jobs: Job[]): Promise<void> {
        this.backlog.push(...jobs)
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
        let job = this.backlog.shift()
        while (job) {
            if (job) {
                await this.queue.dequeue(job)
            }
            job = this.backlog.shift()
        }
        await sleep(1000)
        await this.process()
    }
}
