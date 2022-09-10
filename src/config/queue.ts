import Queue, { defaultQueueProvider } from '../queue'
import EmailJob from '../jobs/EmailJob'
import EventPostJob from '../jobs/EventPostJob'
import TextJob from '../jobs/TextJob'
import UserDeleteJob from '../jobs/UserDeleteJob'
import UserPatchJob from '../jobs/UserPatchJob'
import WebhookJob from '../jobs/WebhookJob'
import App from '../app'

export type Queues = Record<number, Queue>

export const loadJobs = (queue: Queue) => {
    queue.register(EmailJob)
    queue.register(TextJob)
    queue.register(WebhookJob)
    queue.register(UserPatchJob)
    queue.register(UserDeleteJob)
    queue.register(EventPostJob)
}

export const loadQueue = async (projectId: number, app = App.main): Promise<Queue> => {

    const key = `projects_${projectId}_queue`
    const cache = app.get<Queue>(key)
    if (cache) return cache

    const provider = await defaultQueueProvider(projectId)
    const queue = new Queue(provider)

    // TODO: Not scalable, should be shared handlers
    loadJobs(queue)

    app.set(key, queue)
    return app.get(key)
}
