exports.up = async function(knex) {
    await knex.schema.table('lists', function(table) {
        table.timestamp('deleted_at').nullable()
    })
}

exports.down = async function(knex) {
    await knex.schema.table('lists', function(table) {
        table.dropColumn('deleted_at')
    })
}
