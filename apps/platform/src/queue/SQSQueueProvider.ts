import * as AWS from '@aws-sdk/client-sqs'
import { Consumer } from '@rxfork/sqs-consumer'
import { logger } from '../config/logger'
import { AWSConfig } from '../core/aws'
import { batch, uuid } from '../utilities'
import Job, { EncodedJob } from './Job'
import Queue, { QueueTypeConfig } from './Queue'
import QueueProvider from './QueueProvider'

export interface SQSConfig extends QueueTypeConfig, AWSConfig {
    driver: 'sqs'
    queueUrl: string
}

export default class SQSQueueProvider implements QueueProvider {

    config: SQSConfig
    queue: Queue
    app?: Consumer
    sqs: AWS.SQS
    batchSize = 10 as const

    constructor(config: SQSConfig, queue: Queue) {
        this.queue = queue
        this.config = config
        this.sqs = new AWS.SQS({ region: this.config.region })
    }

    parse(message: AWS.Message): EncodedJob {
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

    start(): void {
        const app = Consumer.create({
            queueUrl: this.config.queueUrl,
            handleMessage: async (message) => {
                await this.queue.dequeue(this.parse(message))
            },
            sqs: this.sqs,
        })

        // Catches errors related to the queue / connection
        app.on('error', (error, message) => {
            logger.error({ error, message }, 'sqs:error:connection')
            app.stop()
            // TODO:  this.queue.errored(this.parse(message), error)
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
