exports.up = function(knex) {
    return knex.schema
        .createTable('images', function(table) {
            table.increments()
            table.integer('project_id')
                .unsigned()
                .notNullable()
                .references('id')
                .inTable('projects')
                .onDelete('CASCADE')
            table.string('uuid', 255).notNullable()
            table.string('name', 255).defaultTo('')
            table.string('original_name')
            table.string('extension')
            table.string('alt')
            table.integer('file_size')
            table.timestamp('created_at').defaultTo(knex.fn.now())
            table.timestamp('updated_at').defaultTo(knex.fn.now())
        })
}

exports.down = function(knex) {
    return knex.schema.dropTable('images')
}
