exports.up = async function(knex) {
    await knex.schema.createTable('project_rule_paths', function(table) {
        table.increments()
        table.integer('project_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('projects')
            .onDelete('CASCADE')
        table.string('path').notNullable()
        table.string('name').nullable()
        table.string('type', 50).notNullable() // 'user' | 'event'
        table.timestamp('created_at').defaultTo(knex.fn.now())
        table.timestamp('updated_at').defaultTo(knex.fn.now())
    })
}

exports.down = async function(knex) {
    await knex.schema.dropTable('project_rule_paths')
}
