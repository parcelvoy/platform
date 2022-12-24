exports.up = async function(knex) {
    await knex.schema.table('user_list', function(table) {
        table.unique(['user_id', 'list_id'])
    })
    await knex.schema.table('lists', function(table) {
        table.renameColumn('rules', 'rule')
        table.string('state', 25).after('name')
        table.string('type', 25).after('name')
    })
}

exports.down = async function(knex) {
    await knex.schema.table('user_list', function(table) {
        table.dropUnique(['user_id', 'list_id'])
    })
    await knex.schema.table('lists', function(table) {
        table.renameColumn('rule', 'rules')
        table.dropColumn('state')
        table.dropColumn('type')
    })
}
