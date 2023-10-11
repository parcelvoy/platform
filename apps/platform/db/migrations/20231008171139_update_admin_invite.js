exports.up = async function(knex) {
    await knex.schema.alterTable('admins', function(table) {
        table.string('first_name')
            .nullable()
            .alter()
        table.string('last_name')
            .nullable()
            .alter()
    })
}

exports.down = async function(knex) {
    await knex.schema.alterTable('admins', function(table) {
        table.string('first_name')
            .notNullable()
            .alter()
        table.string('last_name')
            .notNullable()
            .alter()
    })
}
