exports.up = async function(knex) {
    await knex.schema.table('project_rule_paths', function(table) {
        table.string('data_type').defaultTo('string')
        table.enum('visibility', ['public', 'hidden', 'classified']).defaultTo('public').notNullable()
    })
}

exports.down = async function(knex) {
    await knex.schema.table('project_rule_paths', function(table) {
        table.dropColumn('data_type')
        table.dropColumn('visibility')
    })
}
