exports.up = async function(knex) {
    await knex.schema.alterTable('user_events', function(table) {
        table.string('distinct_id')
    })

    // Splitting into second operation to allow for instant add
    // and less table locking
    await knex.schema.alterTable('user_events', function(table) {
        table.unique('distinct_id')
    })
}

exports.down = async function(knex) {
    await knex.schema.alterTable('user_events', function(table) {
        table.dropColumn('distinct_id')
    })
}
