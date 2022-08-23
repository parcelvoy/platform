import Ajv, { JSONSchemaType } from 'ajv'
import { RequestError } from './models/errors'
import Api from './api'
import db, { Knex, migrate } from './config/database'
import { Env } from './config/env'
import Queue from './queue'
import EmailSender from './sender/email/EmailSender'
import TextSender from './sender/text/TextSender'
import WebhookSender from './sender/webhook/WebhookSender'
import configQueue from './config/queue'

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

        // Register jobs
        configQueue(App.$main.queue)

        return App.$main
    }

    api: Api
    queue: Queue
    mailer: EmailSender
    texter: TextSender
    webhooker: WebhookSender
    validator: Ajv

    // eslint-disable-next-line no-useless-constructor
    private constructor(
        public env: Env,
        public db: Knex,
    ) {
        this.api = new Api(this)
        this.queue = new Queue(this.env.queue)
        this.mailer = new EmailSender(this.env.mail)
        this.texter = new TextSender(this.env.text)
        this.webhooker = new WebhookSender(this.env.webhook)
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
