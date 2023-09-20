exports.up = async function(knex) {
    await knex.schema.alterTable('journey_steps', function(table) {
        table.string('name', 128)
    })
}

exports.down = async function(knex) {
    await knex.schema.alterTable('journey_steps', function(table) {
        table.dropColumn('name')
    })
}
