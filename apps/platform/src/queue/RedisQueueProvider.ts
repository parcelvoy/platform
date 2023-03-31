import { Queue as BullQueue, Worker } from 'bullmq'
import { logger } from '../config/logger'
import { batch } from '../utilities'
import Job from './Job'
import Queue, { QueueTypeConfig } from './Queue'
import QueueProvider from './QueueProvider'

export interface RedisConfig extends QueueTypeConfig {
    driver: 'redis'
    host: string
    port: number
}

export default class RedisQueueProvider implements QueueProvider {

    config: RedisConfig
    queue: Queue
    bull: BullQueue
    worker?: Worker
    batchSize = 50 as const

    constructor(config: RedisConfig, queue: Queue) {
        this.queue = queue
        this.config = config
        this.bull = new BullQueue('parcelvoy', { connection: config })
    }

    async enqueue(job: Job): Promise<void> {
        try {
            const { name, data, opts } = this.adaptJob(job)
            await this.bull.add(name, data, opts)
        } catch (error) {
            logger.error(error, 'sqs:error:enqueue')
        }
    }

    async enqueueBatch(jobs: Job[]): Promise<void> {
        for (const part of batch(jobs, this.batchSize)) {
            await this.bull.addBulk(part.map(item => this.adaptJob(item)))
        }
    }

    private adaptJob(job: Job) {
        return {
            name: job.name,
            data: job,
            opts: {
                removeOnComplete: true,
                removeOnFail: {
                    count: 50,
                    age: 24 * 3600, // keep up to 24 hours
                },
                delay: job.options.delay,
            },
        }
    }

    start(): void {
        this.worker = new Worker('parcelvoy', async job => {
            await this.queue.dequeue(job.data)
        }, { connection: this.config, concurrency: 25 })
        this.worker.on('failed', (job, error) => {
            logger.error({ error }, 'sqs:error:processing')
        })
    }

    close(): void {
        this.bull.close()
        this.worker?.close()
    }
}
