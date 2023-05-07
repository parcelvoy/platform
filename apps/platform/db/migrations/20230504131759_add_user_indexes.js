exports.up = async function(knex) {
    await knex.schema.table('users', function(table) {
        table.index('email')
        table.index('phone')
    })
}

exports.down = async function(knex) {
    await knex.schema.table('users', function(table) {
        table.dropIndex('email')
        table.dropIndex('phone')
    })
}
