import Queue from './Queue'
import Job from './Job'

export type QueueProviderName = 'sqs' | 'memory' | 'logger'

export default interface QueueProvider {
    queue: Queue
    enqueue(job: Job): Promise<void>
    start(): void
    close(): void
}
