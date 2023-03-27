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

const migrationConfig = {
    directory: './db/migrations',
    tableName: 'migrations',
    stub: './db/migration.stub',
}

const name = process.argv[2]
if (!name) {
    console.log('migration: please include a name for migration')
    process.exit(9)
}

connection.migrate.make(name, migrationConfig)
    .then(() => {
        console.log('migration create finished')
        process.exit()
    })
    .catch((err) => {
        console.error('migration create failed')
        console.error(err)
        process.exit(1)
    })
