exports.up = async function(knex) {
    await knex.schema
        .alterTable('journeys', function(table) {
            table.json('stats')
            table.timestamp('stats_at')
        })
}

exports.down = async function(knex) {
    await knex.schema
        .alterTable('journeys', function(table) {
            table.dropColumn('stats')
            table.dropColumn('stats_at')
        })
}
