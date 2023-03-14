import Api from './api'
import loadDatabase, { Database } from './config/database'
import loadQueue from './config/queue'
import loadStorage from './config/storage'
import loadAuth from './config/auth'
import loadAnalytics from './config/analytics'
import { Env } from './config/env'
import scheduler from './config/scheduler'
import Queue from './queue'
import Storage from './storage'
import Auth from './auth/Auth'
import { uuid } from './utilities'
import Analytics from './events/Analytics'

export default class App {
    private static $main: App
    static get main() {
        if (!App.$main) {
            throw new Error('Instance not setup')
        }
        return App.$main
    }

    static async init(env: Env): Promise<App> {
        // Load & migrate database
        const database = await loadDatabase(env.db)

        // Load queue
        const queue = loadQueue(env.queue)

        // Load storage
        const storage = loadStorage(env.storage)

        // Load auth
        const auth = loadAuth(env.auth)

        // Load analytics
        const analytics = loadAnalytics(env.analytics)

        // Setup app
        App.$main = new App(env,
            database,
            queue,
            auth,
            storage,
            analytics,
        )

        return App.$main
    }

    uuid = uuid()
    api: Api
    scheduler: any
    #registered: { [key: string | number]: unknown }

    // eslint-disable-next-line no-useless-constructor
    private constructor(
        public env: Env,
        public db: Database,
        public queue: Queue,
        public auth: Auth,
        public storage: Storage,
        public analytics: Analytics,
    ) {
        this.api = new Api(this)
        this.scheduler = scheduler(this)
        this.#registered = {}
    }

    listen() {
        this.api.listen(this.env.port)
    }

    async close() {
        await this.db.destroy()
        await this.queue.close()
    }

    get<T>(key: number | string): T {
        return this.#registered[key] as T
    }

    set(key: number | string, value: unknown) {
        this.#registered[key] = value
    }

    remove(key: number | string) {
        delete this.#registered[key]
    }
}
