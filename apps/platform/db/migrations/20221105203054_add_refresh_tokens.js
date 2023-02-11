exports.up = function(knex) {
    return knex.schema
        .createTable('refresh_tokens', function(table) {
            table.increments()
            table.integer('admin_id')
                .unsigned()
                .notNullable()
                .references('id')
                .inTable('admins')
                .onDelete('CASCADE')
            table.string('token', 255).notNullable().index()
            table.boolean('revoked').defaultsTo(false)
            table.timestamp('expires_at')
            table.timestamp('created_at').defaultTo(knex.fn.now())
            table.timestamp('updated_at').defaultTo(knex.fn.now())
        })
}

exports.down = function(knex) {
    return knex.schema.dropTable('refresh_tokens')
}
