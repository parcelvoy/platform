exports.up = function(knex) {
    return knex.schema
        .alterTable('journey_step_child', function(table) {
            table.integer('priority')
                .notNullable()
                .defaultTo(0)
        })
}

exports.down = function(knex) {
    return knex.schema
        .alterTable('journey_step_child', function(table) {
            table.dropColumn('priority')
        })
}
