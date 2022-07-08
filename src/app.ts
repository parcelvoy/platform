import Api from './api'
import db, { Knex, migrate } from './config/database'
import { BootEnv, Env, loadRemoteEnv } from './config/env'
import Queue from './queue'
import Mailer from './sender/Mailer'

export default class App {

    private static $main: App
    static get main() {
        if (!App.$main) {
            throw new Error('Instance not setup')
        }
        return App.$main
    }

    static async init(bootEnv: BootEnv): Promise<App> {

        // Load database
        const database = db(bootEnv.db)

        // Migrate to latest version
        await migrate(database)
        
        // Load in environment variables from database
        const env = await loadRemoteEnv(database)

        // Setup app
        App.$main = new App(
            database, 
            env,
            new Api(),
            new Mailer(env.mailer),
            new Queue(env.queue)
        )

        return App.$main
    }

    private constructor(
        public db: Knex,
        public env: Env,
        public api: Api,
        public mailer: Mailer,
        public queue: Queue
    ) {
    }

    listen() {
        this.api.listen(this.env.port)
    }
}