exports.up = async function(knex) {
    await knex.schema
        .alterTable('providers', function(table) {
            table.dropIndex('external_id')
            table.dropColumn('external_id')
        })
}

exports.down = async function(knex) {
    await knex.schema
        .alterTable('providers', function(table) {
            table.string('external_id').index()
        })
}
