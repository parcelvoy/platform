exports.up = function(knex) {
    return knex.schema
        .alterTable('journey_steps', function(table) {
            table.float('x').notNullable().defaultTo(0).alter()
            table.float('y').notNullable().defaultTo(0).alter()
        })
}

exports.down = function(knex) {
    return knex.schema
        .alterTable('journey_steps', function(table) {
            table.integer('x').notNullable().defaultTo(0).alter()
            table.integer('y').notNullable().defaultTo(0).alter()
        })
}
