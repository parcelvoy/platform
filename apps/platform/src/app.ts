import loadDatabase, { Database } from './config/database'
import loadQueue from './config/queue'
import loadStorage from './config/storage'
import loadError, { logger } from './config/logger'
import loadRateLimit, { RateLimiter } from './config/rateLimit'
import loadStats, { Stats } from './config/stats'
import type { Env } from './config/env'
import type Queue from './queue'
import Storage from './storage'
import { uuid } from './utilities'
import Api from './api'
import Worker from './worker'
import ErrorHandler from './error/ErrorHandler'
import { DefaultRedis, Redis } from './config/redis'
import EventEmitter from 'eventemitter2'

export default class App {
    private static $main: App
    static get main() {
        if (!App.$main) {
            throw new Error('Instance not setup')
        }
        return App.$main
    }

    static async init<T extends typeof App>(this: T, env: Env): Promise<InstanceType<T>> {

        logger.info('parcelvoy initializing')

        // Boot up error tracking
        const error = await loadError(env.error)

        // Load & migrate database
        const database = await loadDatabase(env.db)

        // Load queue
        const queue = loadQueue(env.queue)

        // Load storage
        const storage = loadStorage(env.storage)

        // Setup app
        const app = new this(env,
            database,
            queue,
            storage,
            error,
        ) as any

        return this.setMain(app)
    }

    static setMain<T extends typeof App>(this: T, app: InstanceType<T>) {
        this.$main = app
        return app
    }

    uuid = uuid()
    api?: Api
    worker?: Worker
    rateLimiter: RateLimiter
    redis: Redis
    stats: Stats
    events = new EventEmitter({ wildcard: true, delimiter: ':' })
    #registered: { [key: string | number]: unknown }

    constructor(
        public env: Env,
        public db: Database,
        public queue: Queue,
        public storage: Storage,
        public error: ErrorHandler,
    ) {
        this.#registered = {}
        this.rateLimiter = loadRateLimit(env.redis)
        this.redis = DefaultRedis(env.redis)
        this.stats = loadStats(env.redis)
        this.unhandledErrorListener()
    }

    start() {
        const runners = this.env.runners
        if (runners.includes('api')) {
            this.startApi()
        }
        if (runners.includes('worker')) {
            this.startWorker()
        }
        return this
    }

    startApi(api?: Api) {
        this.api = api ?? new Api(this)
        const server = this.api?.listen(this.env.port)
        server.keepAliveTimeout = 65000
        server.requestTimeout = 0
        logger.info('parcelvoy:api ready')
    }

    startWorker(worker?: Worker) {
        this.worker = worker ?? new Worker(this)
        this.worker?.run()
        logger.info('parcelvoy:worker ready')
    }

    async close() {
        await this.worker?.close()
        await this.db.destroy()
        await this.queue.close()
        await this.rateLimiter.close()
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

    unhandledErrorListener() {
        ['exit', 'SIGINT', 'SIGUSR1', 'SIGUSR2', 'SIGTERM'].forEach((eventType) => {
            process.on(eventType, async () => {
                await this.close()
                process.exit()
            })
        })
        process.on('uncaughtException', async (error) => {
            logger.error(error, 'uncaught error')
            await this.close()
            process.exit()
        })
    }
}
