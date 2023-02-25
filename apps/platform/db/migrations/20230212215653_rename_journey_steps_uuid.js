/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable('journey_steps', function(table) {
        table.renameColumn('uuid', 'external_id')
    }).then(() => knex.schema.alterTable('journey_steps', function(table) {
        table.string('external_id', 128).alter()
    }))
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.alterTable('journey_steps', function(table) {
        table.renameColumn('external_id', 'uuid')
    }).then(() => knex.schema.alterTable('journey_steps', function(table) {
        table.uuid('uuid').alter()
    }))
}
