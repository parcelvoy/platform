exports.up = async function(knex) {
    await knex.schema.table('projects', function(table) {
        table.string('text_opt_out_message', 255)
    })
}

exports.down = async function(knex) {
    await knex.schema.table('projects', function(table) {
        table.dropColumn('text_opt_out_message')
    })
}
