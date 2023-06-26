exports.up = async function(knex) {
    await knex.schema.table('user_events', function(table) {
        table.index(['name', 'user_id'])
    })
}

exports.down = async function(knex) {
    await knex.schema.table('user_events', function(table) {
        table.dropIndex(['name', 'user_id'])
    })
}
