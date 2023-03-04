import knex, { Knex as Database } from 'knex'

export { Database }

export interface DatabaseConnection {
    host: string
    port: number
    user: string
    password: string
    database?: string
}

export interface DatabaseConfig {
    client: 'mysql2' | 'postgres'
    connection: DatabaseConnection
}

const connect = (config: DatabaseConfig, withDB = true) => {
    let connection = config.connection
    if (!withDB) {
        delete connection.database
    }
    return knex({
        client: config.client,
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

const migrate = async (db: Database) => {
    return db.migrate.latest({
        directory: './db/migrations',
        tableName: 'migrations',
    })
}

export default async (config: DatabaseConfig) => {
    
    // Attempt to connect & migrate
    try {
        const db = connect(config)
        await migrate(db)
        return db
    }
    catch (error) {

        // On error, try to create the database and try again
        const db = connect(config, false)
        db.raw(`CREATE DATABASE parcelvoy`)
        return connect(config)
    }
}
