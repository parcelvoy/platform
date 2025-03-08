import knex from 'knex'

const connection = knex({
    client: process.env.DB_CLIENT ?? 'mysql2',
    connection: {
        host: process.env.DB_HOST,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
        database: process.env.DB_DATABASE,
    },
})

const name = process.argv[2]
if (!name) {
    console.log('migration: please include a migration to output')
    process.exit(9)
}

const logRaw = (sql) => {
    const end = sql.charAt(sql.length - 1)
    console.log(end !== ';' ? sql + ';' : sql)
}

const migration = await import(`../db/migrations/${name}`)
const method = (type) => {
    return (name, query) => {
        const schema = connection.schema
        const result = schema[type](name, query)
        logRaw(result.toString())
        return options.schema
    }
}

const options = {
    schema: {
        table: method('table'),
        createTable: method('createTable'),
        alterTable: method('alterTable'),
        dropTable: method('dropTable'),
    },
    raw: (query) => logRaw(query),
}

console.log('up')
migration.up(options).then(() => {
    console.log('down')
    migration.down(options)
})
