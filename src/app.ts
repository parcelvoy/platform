import db, { Knex } from './config/database'
import env from './config/env'

export default class App {
    db: Knex

    private static $main: App
    static get main() {
        if (!App.$main) {
            App.$main = new App()
        }
        return App.$main
    }

    constructor() {
        this.db = db()
    }

    listen() {

    }
}