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
    return knex(config)
}

export const migrate = async (db: Database) => {
    return db.migrate.latest({
        directory: './db/migrations',
        tableName: 'migrations',
    })
}
