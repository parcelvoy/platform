import * as AWS from '@aws-sdk/client-sqs'
import { Consumer } from '@rxfork/sqs-consumer'
import { logger } from '../config/logger'
import { AWSConfig } from '../core/aws'
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
    app: Consumer
    sqs: AWS.SQS

    constructor(config: SQSConfig, queue: Queue) {
        this.queue = queue
        this.config = config
        this.sqs = new AWS.SQS({ region: this.config.region })
        this.app = Consumer.create({
            queueUrl: this.config.queueUrl,
            handleMessage: async (message) => {
                await this.queue.dequeue(this.parse(message))
            },
            sqs: this.sqs,
        })

        // Catches errors related to the queue / connection
        this.app.on('error', (error, message) => {
            logger.error({ error, message }, 'sqs:error:connection')
            this.app.stop()
            // TODO:  this.queue.errored(this.parse(message), error)
        })

        // Catches errors related to the job
        this.app.on('processing_error', (error) => {
            logger.error({ error }, 'sqs:error:processing')
        })
        this.app.start()
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

    close(): void {
        this.app.stop()
    }
}
