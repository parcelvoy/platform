exports.up = async function(knex) {
    await knex.schema.alterTable('journeys', function(table) {
        table.boolean('published')
    })
}

exports.down = async function(knex) {
    await knex.schema.alterTable('journeys', function(table) {
        table.dropColumn('published')
    })
}
