import Api from './api'
import db, { Knex, migrate } from './config/database'
import { Env } from './config/env'
import Queue from './queue'
import EmailSender from './sender/email/EmailSender'
import TextSender from './sender/text/TextSender'
import WebhookSender from './sender/webhook/Webhook'

export default class App {
    private static $main: App
    static get main () {
        if (!App.$main) {
            throw new Error('Instance not setup')
        }
        return App.$main
    }

    static async init (env: Env): Promise<App> {
        // Load database
        const database = db(env.db)

        // Migrate to latest version
        await migrate(database)

        // Load in environment variables from database
        // const env = await loadRemoteEnv(database)

        // Setup app
        App.$main = new App(
            database,
            env,
            new Api(),
            new Queue(env.queue),
            new EmailSender(env.mail),
            new TextSender(env.text),
            new WebhookSender(env.webhook)
        )

        return App.$main
    }

    // eslint-disable-next-line no-useless-constructor
    private constructor (
        public db: Knex,
        public env: Env,
        public api: Api,
        public queue: Queue,
        public mailer: EmailSender,
        public texter: TextSender,
        public webhooker: WebhookSender
    ) {
    }

    listen () {
        this.api.listen(this.env.port)
    }

    async close () {
        await this.db.destroy()
        await this.queue.close()
    }
}
