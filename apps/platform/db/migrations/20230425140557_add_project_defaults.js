exports.up = async function(knex) {
    await knex.schema.table('projects', function(table) {
        table.json('defaults').nullable().after('timezone')
    })
}

exports.down = async function(knex) {
    await knex.schema.table('projects', function(table) {
        table.dropColumn('defaults')
    })
}
