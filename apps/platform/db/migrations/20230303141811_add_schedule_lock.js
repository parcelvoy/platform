exports.up = async function(knex) {
    await knex.schema.createTable('job_locks', function(table) {
        table.increments()
        table.string('key', 255).unique()
        table.string('owner', 255)
        table.timestamp('expiration')
        table.timestamp('created_at').defaultTo(knex.fn.now())
        table.timestamp('updated_at').defaultTo(knex.fn.now())
    })
}

exports.down = async function(knex) {
    await knex.schema.dropTable('job_locks')
}
