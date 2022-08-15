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

    constructor (queue: Queue) {
        this.queue = queue
        this.start()
    }

    async enqueue (job: Job): Promise<void> {
        this.backlog.push(job)
    }

    start (): void {
        if (this.loop) return
        this.process()
    }

    close (): void {
        clearTimeout(this.loop)
        this.loop = undefined
    }

    private async process () {
        let job;
        while (job = this.backlog.shift()) {
            await this.queue.dequeue(job)
        }
        await this.tick()
        await this.process()
    }

    private async tick (): Promise<void> {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve()
            }, 1000)
        })
    }
}
