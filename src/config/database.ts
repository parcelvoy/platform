import knex, { Knex } from 'knex'

export { Knex }

interface DatabaseConfig {
    host: string
    port: number
    user: string
    password: string
    database: string
}

export default (config: DatabaseConfig) => {
    return knex({
        client: 'mysql',
        connection: config 
    })
}