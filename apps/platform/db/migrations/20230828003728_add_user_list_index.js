exports.up = async function(knex) {
    await knex.schema.table('user_list', function(table) {
        table.index('created_at')
    })
}

exports.down = async function(knex) {
    await knex.schema.table('user_list', function(table) {
        table.dropIndex('created_at')
    })
}
