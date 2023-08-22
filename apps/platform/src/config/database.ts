import knex, { Knex as Database } from 'knex'
import path from 'path'
import { removeKey, sleep } from '../utilities'
import { logger } from './logger'

export { Database }

export interface DatabaseConfig {
    host: string
    port: number
    user: string
    password: string
    database?: string
    migrationPaths: string[]
}

export type Query = (builder: Database.QueryBuilder<any>) => Database.QueryBuilder<any>

const MIGRATION_RETRIES = 3

knex.QueryBuilder.extend('when', function(
    condition: boolean,
    fnif: Query,
    fnelse?: Query,
) {
    return condition ? fnif(this) : (fnelse ? fnelse(this) : this)
})

const connect = (config: DatabaseConfig, withDB = true) => {
    let connection = removeKey('migrationPaths', config)
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

const migrate = async (config: DatabaseConfig, db: Database, retries = MIGRATION_RETRIES): Promise<void> => {
    try {
        return await db.migrate.latest({
            directory: [
                path.resolve(__dirname, '../../db/migrations'),
                ...config.migrationPaths,
            ],
            tableName: 'migrations',
            loadExtensions: ['.js', '.ts'],
        })
    } catch (error: any) {
        if (error?.name === 'MigrationLocked' && retries > 0) {
            --retries
            await sleep((MIGRATION_RETRIES - retries) * 1000)
            return await migrate(config, db, retries)
        }
        throw error
    }
}

const createDatabase = async (config: DatabaseConfig, db: Database) => {
    try {
        await db.raw(`CREATE DATABASE ${config.database}`)
    } catch (error: any) {
        if (error.errno !== 1007) throw error
    }
}

export default async (config: DatabaseConfig) => {

    // Attempt to connect & migrate
    try {
        const db = connect(config)
        await migrate(config, db)
        return db
    } catch (error: any) {

        // Check if error is related to DB not existing
        if (error?.errno === 1049) {

            // Connect without database and create it
            let db = connect(config, false)
            await createDatabase(config, db)

            // Reconnect using new database
            db = connect(config)
            await migrate(config, db)
            return db
        } else {
            logger.error(error, 'database error')
            throw error
        }
    }
}
