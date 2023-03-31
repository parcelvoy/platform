import Queue from './Queue'
import Job from './Job'

export type QueueProviderName = 'sqs' | 'redis' | 'memory' | 'logger'

export default interface QueueProvider {
    queue: Queue
    batchSize: number
    enqueue(job: Job): Promise<void>
    enqueueBatch(jobs: Job[]): Promise<void>
    start(): void
    close(): void
}
