exports.up = async function(knex) {
    await knex.schema.table('providers', function(table) {
        table.integer('rate_limit').nullable().after('is_default')
    })
}

exports.down = async function(knex) {
    await knex.schema.table('providers', function(table) {
        table.dropColumn('rate_limit')
    })
}
