import Queue from './Queue'
import { EncodedJob } from './Job'

export type QueueProviderName = 'sqs' | 'redis' | 'memory' | 'logger'

export interface Metric {
    date: Date
    count: number
}

export interface QueueMetric {
    data: Metric[]
    waiting: number
}

export enum MetricPeriod {
    FIFTEEN_MINUTES = 15,
    ONE_HOUR = 60,
    FOUR_HOURS = 240,
    ONE_WEEK = 10080,
    TWO_WEEKS = 20160,
}

export default interface QueueProvider {
    queue: Queue
    batchSize: number
    enqueue(job: EncodedJob): Promise<void>
    enqueueBatch(jobs: EncodedJob[]): Promise<void>
    delay(job: EncodedJob, milliseconds: number): Promise<void>
    start(): void
    close(): void
    metrics?(period: MetricPeriod): Promise<QueueMetric>
    failed?(): Promise<any>
}
