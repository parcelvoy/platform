import * as AWS from '@aws-sdk/client-sqs'
import { Consumer } from '@rxfork/sqs-consumer'
import { AWSConfig } from '../config/aws'
import Job, { EncodedJob } from './Job'
import Queue, { QueueTypeConfig, QueueProvider } from './Queue'

export interface SQSProviderConfig extends QueueTypeConfig, AWSConfig {
    type: 'sqs'
    queueUrl: string
}

export default class SQSQueueProvider implements QueueProvider {
    
    app: Consumer
    config: SQSProviderConfig
    queue: Queue
    sqs: AWS.SQS

    constructor(config: SQSProviderConfig, queue: Queue) {
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
        this.app.on('error', (error, message) => {
            //TODO:  this.queue.errored(this.parse(message), error)
        })
    }

    parse(message: AWS.Message): EncodedJob {
        return JSON.parse(message.Body ?? '')
    }

    async enqueue(job: Job): Promise<void> {
        const params = {
            DelaySeconds: job.options.delay,
            MessageBody: JSON.stringify(job),
            QueueUrl: this.config.queueUrl
        }
        await this.sqs.sendMessage(params)
    }

    start(): void {
        this.app.start()
    }

    close(): void {
        this.app.stop()
    }
}