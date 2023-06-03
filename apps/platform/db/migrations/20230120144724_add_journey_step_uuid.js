exports.up = async function(knex) {
    await knex.schema.alterTable('journey_steps', function(table) {
        table.uuid('uuid')
        table.integer('x')
            .notNullable()
            .defaultTo(0)
            .alter()
        table.integer('y')
            .notNullable()
            .defaultTo(0)
            .alter()
        table.unique(['journey_id', 'uuid'])
    })
    await knex.schema.createTable('journey_step_child', function(table) {
        table.increments()
        table.integer('step_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('journey_steps')
            .onDelete('CASCADE')
        table.integer('child_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('journey_steps')
            .onDelete('CASCADE')
        table.json('data')
        table.timestamp('created_at').defaultTo(knex.fn.now())
        table.timestamp('updated_at').defaultTo(knex.fn.now())
        table.unique(['step_id', 'child_id'])
    })
}

exports.down = function(knex) {
    return knex.schema
        .alterTable('journey_steps', function(table) {
            table.dropUnique(['journey_id', 'uuid'])
            table.dropColumn('uuid')
            table.integer('x').nullable().alter()
            table.integer('y').nullable().alter()
        })
        .dropTable('journey_step_child')
}
