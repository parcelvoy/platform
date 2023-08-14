exports.up = async function(knex) {
    await knex.schema.createTable('locales', function(table) {
        table.increments()
        table.integer('project_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('projects')
            .onDelete('CASCADE')
        table.string('key')
        table.string('label')
        table.timestamp('created_at').defaultTo(knex.fn.now())
        table.timestamp('updated_at').defaultTo(knex.fn.now())
    })
}

exports.down = async function(knex) {
    await knex.schema.dropTable('locales')
}
