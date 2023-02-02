import knex, { Knex as Database } from 'knex'

export { Database }

export interface DatabaseConnection {
    host: string
    port: number
    user: string
    password: string
    database: string
}

export interface DatabaseConfig {
    client: 'mysql2' | 'postgres'
    connection: DatabaseConnection
}

export default (config: DatabaseConfig) => {
    return knex({
        client: config.client,
        connection: {
            ...config.connection,
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

export const migrate = async (db: Database) => {
    return db.migrate.latest({
        directory: './db/migrations',
        tableName: 'migrations',
    })
}
