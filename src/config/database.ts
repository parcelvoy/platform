import knex, { Knex } from 'knex'

export { Knex }

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

export const migrate = async (db: Knex) => {
    return db.migrate.latest({
        directory: './db/migrations',
        tableName: 'migrations'
    })
}
