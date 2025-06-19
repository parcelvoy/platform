/* eslint-disable @typescript-eslint/no-var-requires */
const clickhouse = require('@clickhouse/client')
const Redis = require('ioredis')

exports.up = async function(knex) {

    const clickhouseConfig = {
        url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
        username: process.env.CLICKHOUSE_USERNAME || 'default',
        password: process.env.CLICKHOUSE_PASSWORD,
    }
    const isTest = process.env.NODE_ENV === 'test'

    let client = clickhouse.createClient(clickhouseConfig)
    const redis = new Redis({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT || 6379,
        username: process.env.REDIS_USERNAME,
        password: process.env.REDIS_PASSWORD,
        tls: process.env.REDIS_TLS === 'true'
            ? { rejectUnauthorized: false }
            : undefined,
    })

    if (process.env.CLICKHOUSE_DATABASE) {
        await client.command({
            query: 'CREATE DATABASE IF NOT EXISTS ' + process.env.CLICKHOUSE_DATABASE,
        })
        client = clickhouse.createClient({
            ...clickhouseConfig,
            database: process.env.CLICKHOUSE_DATABASE,
        })
    }

    // Enable JSON type
    await client.command({ query: 'SET enable_json_type = 1' })

    await client.command({
        query: 'DROP TABLE IF EXISTS user_events',
    })

    // Event object
    await client.command({
        query: `
            CREATE TABLE user_events
            (
                name String,
                project_id UInt16,
                user_id UInt64,
                uuid UUID,
                created_at DateTime64(3, 'UTC'),
                data JSON,
                PROJECTION user_lookup_proj
                (
                    SELECT *
                    ORDER BY (project_id, user_id, created_at)
                )
            )
            ENGINE MergeTree()
            ORDER BY (project_id, name, created_at)
            ${isTest ? '' : 'PARTITION BY project_id'}
            SETTINGS enable_json_type = 1
        `,
    })

    await client.command({
        query: 'DROP TABLE IF EXISTS users',
    })

    // User object
    await client.command({
        query: `
            CREATE TABLE users
            (
                id UInt64,
                project_id UInt16,
                anonymous_id String,
                external_id String,
                email String,
                phone String,
                timezone String,
                locale String,
                data JSON,
                devices Array(JSON),
                unsubscribe_ids Array(UInt32),
                created_at DateTime64(3, 'UTC'),
                sign Int8,
                version UInt64
            )
            ENGINE = VersionedCollapsingMergeTree(sign, version)
            ORDER BY (project_id, id)
            ${isTest ? '' : 'PARTITION BY project_id'}
            SETTINGS enable_json_type = 1
        `,
    })

    // Add new column to users table
    const hasColumn = await knex.raw('SHOW COLUMNS FROM `users` LIKE \'unsubscribe_ids\'')
    if (hasColumn[0].length <= 0) {
        await knex.schema.table('users', function(table) {
            table.json('unsubscribe_ids').nullable()
            table.bigint('version').defaultTo(0).notNullable()
        })
    }

    await redis.set('migration:lists', JSON.stringify(true))
    await redis.set('migration:events', JSON.stringify(true))
    await redis.set('migration:users', JSON.stringify(true))
}

exports.down = async function() {
    const client = clickhouse.createClient({
        url: process.env.CLICKHOUSE_URL,
        username: process.env.CLICKHOUSE_USERNAME,
        password: process.env.CLICKHOUSE_PASSWORD,
    })

    await client.command({
        query: 'DROP TABLE IF EXISTS user_events',
    })

    await client.command({
        query: 'DROP TABLE IF EXISTS users',
    })
}
