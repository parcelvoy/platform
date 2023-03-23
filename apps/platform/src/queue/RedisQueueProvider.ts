import { Queue as BullQueue, Worker } from 'bullmq'
import { logger } from '../config/logger'
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
    worker: Worker

    constructor(config: RedisConfig, queue: Queue) {
        this.queue = queue
        this.config = config
        this.bull = new BullQueue('parcelvoy', { connection: config })
        this.worker = new Worker('parcelvoy', async job => {
            await this.queue.dequeue(job.data)
        }, { connection: config })
        this.worker.on('failed', (job, error) => {
            logger.error({ error }, 'sqs:error:processing')
        })
    }

    async enqueue(job: Job): Promise<void> {
        try {
            await this.bull.add(job.name, job, {
                removeOnComplete: 50,
                removeOnFail: 50,
                delay: job.options.delay,
            })
        } catch (error) {
            logger.error(error, 'sqs:error:enqueue')
        }
    }

    close(): void {
        this.worker.close()
    }
}
