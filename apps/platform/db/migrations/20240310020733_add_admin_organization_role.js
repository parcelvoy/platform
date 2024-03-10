exports.up = async function(knex) {
    await knex.schema
        .alterTable('admins', function(table) {
            table.string('role', 64).notNullable().defaultTo('member')
        })
    await knex('admins').update({ role: 'owner' })
}

exports.down = async function(knex) {
    await knex.schema
        .alterTable('admins', function(table) {
            table.dropColumn('role')
        })
}
