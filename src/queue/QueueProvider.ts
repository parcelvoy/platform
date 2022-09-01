import Queue from './Queue'
import Job from './Job'
import { Provider } from '../env/Provider'

export type QueueProviderName = 'sqs' | 'memory'

export default abstract class QueueProvider extends Provider {
    abstract load(queue: Queue): void
    abstract enqueue(job: Job): Promise<void>
    abstract start(): void
    abstract close(): void
}
