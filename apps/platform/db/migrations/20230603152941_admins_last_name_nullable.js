exports.up = async function(knex) {
    await knex.schema.table('admins', function(table) {
        table.string('last_name', 255).nullable().alter()
    })
}

exports.down = async function(knex) {
    await knex.schema.table('admins', function(table) {
        table.string('last_name', 255).notNullable().alter()
    })
}
