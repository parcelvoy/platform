import Queue, { defaultQueueProvider } from '../queue'
import EmailJob from '../channels/email/EmailJob'
import EventPostJob from '../client/EventPostJob'
import TextJob from '../channels/text/TextJob'
import UserDeleteJob from '../client/UserDeleteJob'
import UserPatchJob from '../client/UserPatchJob'
import WebhookJob from '../channels/webhook/WebhookJob'
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
