exports.up = function(knex) {
    return knex.schema
        .createTable('providers', function(table) {
            table.increments()
            table.integer('project_id')
                .unsigned()
                .notNullable()
                .references('id')
                .inTable('projects')
                .onDelete('CASCADE')
            table.string('external_id').index()
            table.string('name', 255).defaultTo('')
            table.string('group', 255).notNullable()
            table.json('data')
            table.boolean('is_default').defaultTo(0)
            table.timestamp('created_at').defaultTo(knex.fn.now())
            table.timestamp('updated_at').defaultTo(knex.fn.now())
        })
}

exports.down = function(knex) {
    knex.schema
        .dropTable('providers')
}
