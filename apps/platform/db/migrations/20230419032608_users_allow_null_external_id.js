exports.up = async function(knex) {
    await knex.schema.table('users', function(table) {
        table.string('external_id', 255).nullable().alter()
    })
}

exports.down = async function(knex) {
    await knex.schema.table('users', function(table) {
        table.string('external_id', 255).notNullable().alter()
    })
}
