exports.up = async function(knex) {
    await knex.schema.renameTable('refresh_tokens', 'access_tokens')
    await knex.schema.alterTable('access_tokens', function(table) {
        table.string('ip')
        table.string('user_agent')
    })
}

exports.down = function(knex) {
    return knex.schema.dropTable('revoked_access_tokens')
}
