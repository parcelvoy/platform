import * as AWS from '@aws-sdk/client-sqs'
import Job, { EncodedJob } from './Job'
import Queue, { QueueTypeConfig, QueueProvider } from './Queue'

export interface MemoryConfig extends QueueTypeConfig {
    driver: 'memory'
}

export default class MemoryQueueProvider implements QueueProvider {
    
    queue: Queue
    backlog: Job[] = []
    loop: NodeJS.Timeout | undefined

    constructor(queue: Queue) {
        this.queue = queue
        this.start()
    }

    async enqueue(job: Job): Promise<void> {
        this.backlog.concat(job)
    }

    start(): void {
        if (this.loop) return
        this.process()
    }

    close(): void {
        clearTimeout(this.loop)
        this.loop = undefined
    }
    
    private async process() {
        for (const job of this.backlog) {
            await this.queue.dequeue(job)
        }
        await this.tick()
        await this.process()
    }

    private async tick(): Promise<void> {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve()
            }, 1000)
        })
    }

}