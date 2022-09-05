import { defaultProvider } from '../core/Provider'
import Job, { EncodedJob } from './Job'
import MemoryQueueProvider from './MemoryQueueProvider'
import Queue from './Queue'
import QueueProvider, { QueueProviderName } from './QueueProvider'
import SQSQueueProvider from './SQSQueueProvider'

export const providerMap = (record: { name: QueueProviderName }): QueueProvider => {
    return {
        sqs: SQSQueueProvider.fromJson(record),
        memory: MemoryQueueProvider.fromJson(record),
    }[record.name]
}

export const defaultQueueProvider = async (projectId: number): Promise<QueueProvider> => {
    const provider = await defaultProvider('queue', projectId, providerMap)
    if (!provider) return new MemoryQueueProvider()
    return provider
}

export { Job, EncodedJob }
export default Queue
