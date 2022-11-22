exports.up = function(knex) {
    return knex.schema
        .table('campaigns', function(table) {
            table.timestamp('send_at').after('subscription_id')
            table.json('delivery').after('subscription_id')
            table.string('state', 20).after('subscription_id')
        })
}

exports.down = function(knex) {
    return knex.schema
        .table('campaigns', function(table) {
            table.dropColumn('send_at')
            table.dropColumn('delivery')
            table.dropColumn('state')
        })
}
