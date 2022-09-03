import Ajv, { JSONSchemaType } from 'ajv'
import { RequestError } from './models/errors'
import Api from './api'
import db, { Database, migrate } from './config/database'
import { Env } from './config/env'

export default class App {
    private static $main: App
    static get main() {
        if (!App.$main) {
            throw new Error('Instance not setup')
        }
        return App.$main
    }

    static async init(env: Env): Promise<App> {
        // Load database
        const database = db(env.db)

        // Migrate to latest version
        await migrate(database)

        // Setup app
        App.$main = new App(env, database)

        return App.$main
    }

    api: Api
    validator: Ajv
    #registered: { [key: string | number]: unknown }

    // eslint-disable-next-line no-useless-constructor
    private constructor(
        public env: Env,
        public db: Database,
    ) {
        this.api = new Api(this)
        this.validator = new Ajv()
        this.#registered = {}

        // TODO: Need to somehow pre-warm or boot up queues so jobs
        // can run without having to first add one
    }

    listen() {
        this.api.listen(this.env.port)
    }

    async close() {
        await this.db.destroy()
        // await this.queue.close()
    }

    get<T>(key: number | string): T {
        return this.#registered[key] as T
    }

    set(key: number | string, value: unknown) {
        this.#registered[key] = value
    }

    validate<T>(schema: JSONSchemaType<T>, data: any) {
        const validate = this.validator.compile(schema)
        if (validate(data)) {
            return data
        }
        throw new RequestError(JSON.stringify(validate.errors), 422)
    }
}
