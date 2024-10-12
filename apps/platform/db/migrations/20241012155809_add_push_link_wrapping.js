exports.up = async function(knex) {
    await knex.schema.table('projects', function(table) {
        table.renameColumn('link_wrap', 'link_wrap_email')
        table.boolean('link_wrap_push').defaultTo(0)
    })
}

exports.down = async function(knex) {
    await knex.schema.table('projects', function(table) {
        table.renameColumn('link_wrap_email', 'link_wrap')
        table.dropColumn('link_wrap_push')
    })
}
