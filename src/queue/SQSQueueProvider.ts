import * as AWS from '@aws-sdk/client-sqs'
import { Consumer } from '@rxfork/sqs-consumer'
import { AWSConfig } from '../config/aws'
import Job, { EncodedJob } from './Job'
import Queue, { QueueTypeConfig } from './Queue'
import QueueProvider from './QueueProvider'

export interface SQSConfig extends QueueTypeConfig, AWSConfig {
    driver: 'sqs'
    queueUrl: string
}

export default class SQSQueueProvider implements QueueProvider {
    app: Consumer
    config: SQSConfig
    queue: Queue
    sqs: AWS.SQS

    constructor (config: SQSConfig, queue: Queue) {
        this.queue = queue
        this.config = config
        this.sqs = new AWS.SQS({ region: config.region })
        this.app = Consumer.create({
            queueUrl: config.queueUrl,
            handleMessage: async (message) => {
                await this.queue.dequeue(this.parse(message))
            },
            sqs: this.sqs
        })

        // Catches errors related to the queue / connection
        this.app.on('error', (error, message) => {
            console.log(error, message)
            // TODO:  this.queue.errored(this.parse(message), error)
        })

        // Catches errors related to the job
        this.app.on('processing_error', (err) => {
            console.error(err.message)
        })
        this.app.start()
    }

    parse (message: AWS.Message): EncodedJob {
        return JSON.parse(message.Body ?? '')
    }

    async enqueue (job: Job): Promise<void> {
        const params = {
            DelaySeconds: job.options.delay,
            MessageBody: JSON.stringify(job),
            QueueUrl: this.config.queueUrl
        }
        await this.sqs.sendMessage(params)
    }

    start (): void {
        this.app.start()
    }

    close (): void {
        this.app.stop()
    }
}
