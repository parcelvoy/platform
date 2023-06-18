import knex, { Knex as Database } from 'knex'
import path from 'path'
import { removeKey } from '../utilities'
import { logger } from './logger'

export { Database }

export interface DatabaseConfig {
    host: string
    port: number
    user: string
    password: string
    database?: string
}

export type Query = (builder: Database.QueryBuilder<any>) => Database.QueryBuilder<any>

knex.QueryBuilder.extend('when', function(
    condition: boolean,
    fnif: Query,
    fnelse?: Query,
) {
    return condition ? fnif(this) : (fnelse ? fnelse(this) : this)
})

const connect = (config: DatabaseConfig, withDB = true) => {
    let connection = config
    if (!withDB) {
        connection = removeKey('database', connection)
    }
    return knex({
        client: 'mysql2',
        connection: {
            ...connection,
            typeCast(field: any, next: any) {
                if (field.type === 'TINY' && field.length === 1) {
                    return field.string() === '1'
                }
                return next()
            },
        },
        asyncStackTraces: true,
    })
}

const migrate = async (config: DatabaseConfig, db: Database, fresh = false) => {
    if (fresh) await db.raw(`CREATE DATABASE ${config.database}`)
    return db.migrate.latest({
        directory: path.resolve(__dirname, '../../db/migrations'),
        tableName: 'migrations',
        loadExtensions: ['.js', '.ts'],
    })
}

export default async (config: DatabaseConfig) => {

    // Attempt to connect & migrate
    try {
        const db = connect(config)
        await migrate(config, db)
        return db
    } catch (error: any) {

        logger.error(error, 'database error')

        if (error?.errno === 1049) {
            // On error, try to create the database and try again
            const db = connect(config, false)
            await migrate(config, db, true)
            return connect(config)
        } else {
            throw error
        }
    }
}
