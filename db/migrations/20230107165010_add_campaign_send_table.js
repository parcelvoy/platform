exports.up = function(knex) {
    return knex.schema
        .createTable('campaign_sends', function(table) {
            table.increments()
            table.integer('campaign_id')
                .unsigned()
                .notNullable()
                .references('id')
                .inTable('campaigns')
                .onDelete('CASCADE')
            table.integer('user_id')
                .unsigned()
                .notNullable()
                .references('id')
                .inTable('users')
                .onDelete('CASCADE')
            table.string('state', 50).index()
            table.timestamp('send_at').index().nullable()
            table.timestamp('created_at').defaultTo(knex.fn.now())
            table.timestamp('updated_at').defaultTo(knex.fn.now())
            table.unique(['user_id', 'campaign_id'])
        })
        .table('campaigns', function(table) {
            table.boolean('send_in_user_timezone')
                .defaultTo(0)
                .after('send_at')
        })
}

exports.down = function(knex) {
    knex.schema
        .dropTable('campaign_sends')
        .table('campaigns', function(table) {
            table.dropColumn('send_in_user_timezone')
        })
}
