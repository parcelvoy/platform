exports.up = async function(knex) {
    await knex.schema.table('campaign_sends', function(table) {
        table.integer('clicks').defaultTo(0).after('send_at')
        table.timestamp('opened_at').nullable().after('send_at')
    })
}

exports.down = async function(knex) {
    await knex.schema.table('campaign_sends', function(table) {
        table.dropColumn('clicks')
        table.dropColumn('opened_at')
    })
}
