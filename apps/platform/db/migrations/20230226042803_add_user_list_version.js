exports.up = async function(knex) {
    await knex.schema.table('user_list', function(table) {
        table.integer('version').after('event_id').defaultTo(0).index()
    })
    await knex.schema.table('lists', function(table) {
        table.integer('version').after('users_count').defaultTo(0)
    })
}

exports.down = async function(knex) {
    await knex.schema.table('user_list', function(table) {
        table.dropColumn('version')
    })
    await knex.schema.table('lists', function(table) {
        table.dropColumn('version')
    })
}
