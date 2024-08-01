import { Consumer } from 'sqs-consumer'
import { logger } from '../config/logger'
import { AWSConfig } from '../core/aws'
import { batch, uuid } from '../utilities'
import Job, { EncodedJob } from './Job'
import Queue, { QueueTypeConfig } from './Queue'
import QueueProvider from './QueueProvider'
import { SQS, Message } from '@aws-sdk/client-sqs'

export interface SQSConfig extends QueueTypeConfig, AWSConfig {
    driver: 'sqs'
    queueUrl: string
}

export default class SQSQueueProvider implements QueueProvider {

    config: SQSConfig
    queue: Queue
    app?: Consumer
    sqs: SQS
    batchSize = 10 as const

    constructor(config: SQSConfig, queue: Queue) {
        this.queue = queue
        this.config = config
        this.sqs = new SQS({ region: this.config.region })
    }

    parse(message: Message): EncodedJob {
        return JSON.parse(message.Body ?? '')
    }

    async enqueue(job: Job): Promise<void> {
        try {
            const params = {
                DelaySeconds: job.options.delay,
                MessageBody: JSON.stringify(job),
                QueueUrl: this.config.queueUrl,
            }
            await this.sqs.sendMessage(params)
        } catch (error) {
            logger.error(error, 'sqs:error:enqueue')
        }
    }

    async enqueueBatch(jobs: Job[]): Promise<void> {

        // If provided array of jobs is larger than max supported
        // batch by AWS, batch the batch
        for (const part of batch(jobs, this.batchSize)) {
            try {
                const params = {
                    QueueUrl: this.config.queueUrl,
                    Entries: part.map(item => ({
                        Id: uuid(),
                        MessageBody: JSON.stringify(item),
                        DelaySeconds: item.options.delay,
                    })),
                }
                await this.sqs.sendMessageBatch(params)
            } catch (error) {
                logger.error(error, 'sqs:error:enqueue')
            }
        }
    }

    async delay(job: Job, milliseconds: number): Promise<void> {
        // SQS Delay is in seconds, so convert milliseconds to seconds
        // also, max delay is 15 minutes
        const seconds = Math.min(Math.floor(milliseconds / 1000), 900)
        job.options.delay = seconds
        await this.enqueue(job)
    }

    start(): void {
        const app = Consumer.create({
            queueUrl: this.config.queueUrl,
            handleMessage: async (message) => {
                await this.queue.dequeue(this.parse(message))
                return message
            },
            handleMessageBatch: async (messages) => {

                // Map messages to job operations
                const promises = messages.map(message =>
                    this.queue.dequeue(this.parse(message)),
                )

                // Execute each job and get results
                const results = await Promise.allSettled(promises)

                // Return the messages that have succeeded to awk them
                return messages.reduce((acc: Message[], curr, index) => {
                    const status = results[index].status === 'fulfilled'
                    if (status) {
                        acc.push(curr)
                    }
                    return acc
                }, [])
            },
            batchSize: this.batchSize,
            sqs: this.sqs,
        })

        // Catches errors related to the queue / connection
        app.on('error', (error, message) => {
            if (Array.isArray(message)) {
                message.forEach(message => this.queue.errored(error, this.parse(message)))
            } else if (message) {
                this.queue.errored(error, this.parse(message))
            } else {
                this.queue.errored(error)
            }
        })

        // Catches errors related to the job
        app.on('processing_error', (error) => {
            logger.error({ error }, 'sqs:error:processing')
        })
        app.start()
        this.app = app
    }

    close(): void {
        this.app?.stop()
    }
}
