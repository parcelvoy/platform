exports.up = async function(knex) {
    await knex.schema.table('campaigns', function(table) {
        table.string('type', 255).after('id')
    })
    await knex.raw('UPDATE campaigns SET type = IF(list_ids IS NULL, "trigger", "blast")')
}

exports.down = async function(knex) {
    await knex.schema.table('campaigns', function(table) {
        table.dropColumn('type')
    })
}
