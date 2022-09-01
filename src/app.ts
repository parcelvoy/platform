import Ajv, { JSONSchemaType } from 'ajv'
import { RequestError } from './models/errors'
import Api from './api'
import db, { Database, migrate } from './config/database'
import { Env } from './config/env'
import Queue from './queue'
import configQueue from './config/queue'
import { Channels, configChannels, ChannelAccessor } from './config/channels'

export default class App extends ChannelAccessor {
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

        // Load channels
        const channels = await configChannels(database)

        console.log(channels)

        // Setup Queue and register jobs
        const queue = await configQueue(database)

        // Setup app
        App.$main = new App(env, database, queue, channels)

        return App.$main
    }

    api: Api
    validator: Ajv

    // eslint-disable-next-line no-useless-constructor
    private constructor(
        public env: Env,
        public db: Database,
        public queue: Queue,
        channels: Channels,
    ) {
        super(channels)
        this.api = new Api(this)
        this.validator = new Ajv()
    }

    listen() {
        this.api.listen(this.env.port)
    }

    async close() {
        await this.db.destroy()
        await this.queue.close()
    }

    validate<T>(schema: JSONSchemaType<T>, data: any) {
        const validate = this.validator.compile(schema)
        if (validate(data)) {
            return data
        }
        throw new RequestError(JSON.stringify(validate.errors), 422)
    }
}
