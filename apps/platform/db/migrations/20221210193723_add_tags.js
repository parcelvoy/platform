exports.up = function(knex) {
    return knex.schema
        .createTable('tags', function(table) {
            table.increments()
            table.integer('project_id')
                .unsigned()
                .notNullable()
                .references('id')
                .inTable('projects')
                .onDelete('CASCADE')
            table.string('name', 255).defaultTo('')
            table.timestamp('created_at').defaultTo(knex.fn.now())
            table.timestamp('updated_at').defaultTo(knex.fn.now())
        })
        .createTable('entity_tags', function(table) {
            table.increments()
            table.integer('tag_id')
                .unsigned()
                .notNullable()
                .references('id')
                .inTable('tags')
                .onDelete('CASCADE')
            table.string('entity', 255)
            table.integer('entity_id')
                .unsigned()
                .notNullable() // no fk constraint
            table.timestamp('created_at').defaultTo(knex.fn.now())
            table.timestamp('updated_at').defaultTo(knex.fn.now())
        })
}

exports.down = function(knex) {
    return knex.schema
        .dropTable('entity_tags')
        .dropTable('tags')
}
