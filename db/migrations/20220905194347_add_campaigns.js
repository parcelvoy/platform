exports.up = function(knex) {
    return knex.schema
        .createTable('campaigns', function(table) {
            table.increments()
            table.integer('project_id')
                .unsigned()
                .notNullable()
                .references('id')
                .inTable('projects')
                .onDelete('CASCADE')
            table.integer('list_id')
                .unsigned()
                .notNullable()
                .references('id')
                .inTable('lists')
                .onDelete('CASCADE')
            table.string('name', 255).defaultTo('')
            table.string('channel', 255).notNullable()
            table.integer('template_id')
                .unsigned()
                .notNullable()
                .references('id')
                .inTable('templates')
                .onDelete('CASCADE')
            table.timestamp('created_at').defaultTo(knex.fn.now())
            table.timestamp('updated_at').defaultTo(knex.fn.now())
        })
}

exports.down = function(knex) {
    knex.schema
        .dropTable('campaigns')
}
