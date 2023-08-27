exports.up = async function(knex) {
    await knex.schema.table('user_events', function(table) {
        table.index('created_at')
    })
    await knex.schema.table('users', function(table) {
        table.index('updated_at')
    })
}

exports.down = async function(knex) {
    await knex.schema.table('user_events', function(table) {
        table.dropIndex('created_at')
    })
    await knex.schema.table('users', function(table) {
        table.dropIndex('updated_at')
    })
}
