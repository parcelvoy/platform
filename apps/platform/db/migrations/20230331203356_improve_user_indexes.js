exports.up = async function(knex) {
    await knex.schema
        .alterTable('users', function(table) {
            table.index('external_id')
            table.index('anonymous_id')
            table.index('project_id')
        })
}

exports.down = async function(knex) {
    await knex.schema
        .alterTable('users', function(table) {
            table.dropIndex('external_id')
            table.dropIndex('anonymous_id')
            table.dropIndex('project_id')
        })
}
