import loadDatabase, { Database } from './config/database'
import loadQueue from './config/queue'
import loadStorage from './config/storage'
import loadAuth from './config/auth'
import type { Env } from './config/env'
import type Queue from './queue'
import Storage from './storage'
import type Auth from './auth/Auth'
import { uuid } from './utilities'
import Api from './api'
import Worker from './worker'

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

        // Setup app
        App.$main = new App(env,
            database,
            queue,
            auth,
            storage,
        )

        return App.$main
    }

    uuid = uuid()
    api?: Api
    worker?: Worker
    #registered: { [key: string | number]: unknown }

    // eslint-disable-next-line no-useless-constructor
    private constructor(
        public env: Env,
        public db: Database,
        public queue: Queue,
        public auth: Auth,
        public storage: Storage,
    ) {
        this.#registered = {}
    }

    async start() {
        const runners = this.env.runners
        if (runners.includes('api')) {
            this.api = new Api(this)
            this.api?.listen(this.env.port)
        }
        if (runners.includes('worker')) {
            this.worker = new Worker(this)
            this.worker?.run()
        }
    }

    async close() {
        await this.worker?.close()
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
