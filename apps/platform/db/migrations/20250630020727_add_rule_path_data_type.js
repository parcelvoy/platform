exports.up = async function(knex) {
    await knex.schema.table('project_rule_paths', function(table) {
        table.string('data_type').defaultTo('string')
        table.integer('reference_id')
            .unsigned()
            .nullable()
        table.index('reference_id')
    })
}

exports.down = async function(knex) {
    await knex.schema.table('project_rule_paths', function(table) {
        table.dropColumn('data_type')
        table.dropColumn('reference_id')
    })
}
