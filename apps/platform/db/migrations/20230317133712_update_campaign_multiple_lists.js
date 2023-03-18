exports.up = async function(knex) {
    await knex.schema.table('campaigns', function(table) {
        table.json('exclusion_list_ids').after('list_id')
        table.json('list_ids').after('list_id')
    })
    await knex.raw('UPDATE campaigns SET list_ids = CONCAT("[", campaigns.list_id, "]")')
    await knex.schema.table('campaigns', function(table) {
        table.dropForeign('list_id')
        table.dropColumn('list_id')
    })
}

exports.down = async function(knex) {
    await knex.schema.table('campaigns', function(table) {
        table.integer('list_id')
            .unsigned()
            .references('id')
            .inTable('lists')
            .onDelete('CASCADE')
            .after('project_id')
        table.dropColumn('list_ids')
        table.dropColumn('exclusion_list_ids')
    })
}
