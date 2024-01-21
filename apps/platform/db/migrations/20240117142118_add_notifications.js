exports.up = async function(knex) {
    await knex.schema.createTable('notifications', function(table) {
        table.increments()
        table.integer('project_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('projects')
            .onDelete('CASCADE')
        table.integer('user_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('users')
            .onDelete('CASCADE')
        table.string('content_type')
        table.json('content')
        table.timestamp('read_at').nullable()
        table.timestamp('expires_at').nullable()
        table.timestamp('created_at').defaultTo(knex.fn.now())
        table.timestamp('updated_at').defaultTo(knex.fn.now())
    })
}

exports.down = async function(knex) {
    await knex.schema.dropTable('notifications')
}
