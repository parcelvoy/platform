exports.up = async function(knex) {
    await knex.schema.createTable('resources', function(table) {
        table.increments()
        table.integer('project_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('projects')
            .onDelete('CASCADE')
        table.string('type')
        table.string('name')
        table.json('value')
        table.timestamp('created_at').defaultTo(knex.fn.now())
        table.timestamp('updated_at').defaultTo(knex.fn.now())
    })
}

exports.down = async function(knex) {
    await knex.schema.dropTable('resources')
}
