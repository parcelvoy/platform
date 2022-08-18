exports.up = function(knex) {
    return knex.schema
        .createTable('lists', function(table) {
            table.increments()
            table.string('name', 255).defaultTo('')
            table.integer('project_id')
                .unsigned()
                .notNullable()
                .references('id')
                .inTable('projects')
                .onDelete('CASCADE')
            table.json('rules')
            table.timestamp('created_at').defaultTo(knex.fn.now())
            table.timestamp('updated_at').defaultTo(knex.fn.now())
        })
        .createTable('user_list', function(table) {
            table.increments()
            table.integer('user_id')
                .unsigned()
                .notNullable()
                .references('id')
                .inTable('users')
                .onDelete('CASCADE')
            table.integer('list_id')
                .unsigned()
                .notNullable()
                .references('id')
                .inTable('lists')
                .onDelete('CASCADE')
            table.integer('event_id')
                .unsigned()
                .references('id')
                .inTable('events')
                .onDelete('CASCADE')
            table.timestamp('created_at').defaultTo(knex.fn.now())
            table.timestamp('updated_at').defaultTo(knex.fn.now())
        })
}

exports.down = function(knex) {
    knex.schema
        .dropTable('user_list')
        .dropTable('lists')
}
