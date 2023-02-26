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
            table.integer('provider_id')
                .unsigned()
                .notNullable()
                .references('id')
                .inTable('providers')
                .onDelete('CASCADE')
                .after('channel')
            table.boolean('send_in_user_timezone')
                .defaultTo(0)
                .after('send_at')
            table.dropForeign('template_id')
            table.dropColumn('template_id')
            table.timestamp('deleted_at').nullable()
        })
        .table('projects', function(table) {
            table.string('locale', 50)
        })
        .table('templates', function(table) {
            table.string('locale', 50)
            table.integer('campaign_id')
                .unsigned()
                .notNullable()
                .references('id')
                .inTable('campaigns')
                .onDelete('CASCADE')
        })
        .table('users', function(table) {
            table.string('timezone', 50).after('devices')
        })
        .table('providers', function(table) {
            table.renameColumn('name', 'type')
        })
        .table('providers', function(table) {
            table.string('name', 255)
        })
}

exports.down = function(knex) {
    knex.schema
        .dropTable('campaign_sends')
        .table('campaigns', function(table) {
            table.dropColumn('send_in_user_timezone')
            table.integer('template_id')
                .unsigned()
                .notNullable()
                .references('id')
                .inTable('templates')
                .onDelete('CASCADE')
            table.dropColumn('provider_id')
            table.dropColumn('deleted_at')
        })
        .table('projects', function(table) {
            table.dropColumn('locale')
        })
        .table('templates', function(table) {
            table.dropColumn('locale')
            table.dropColumn('campaign_id')
        })
        .table('providers', function(table) {
            table.dropColumn('name')
            table.renameColumn('type', 'name')
        })
}
