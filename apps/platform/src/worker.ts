import { loadJobs } from './config/queue'
import scheduler, { Scheduler } from './config/scheduler'
import Queue from './queue'

export default class Worker {
    worker: Queue
    scheduler: Scheduler

    constructor(
        public app: import('./app').default,
    ) {
        this.worker = new Queue(app.env.queue)
        this.scheduler = scheduler(app)
        this.loadJobs()
    }

    run() {
        this.worker.start()
    }

    async close() {
        await this.worker.close()
        await this.scheduler.close()
    }

    loadJobs() {
        loadJobs(this.worker)
    }
}
