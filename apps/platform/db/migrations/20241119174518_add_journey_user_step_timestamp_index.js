exports.up = async function(knex) {
    await knex.schema.alterTable('journey_user_step', function(table) {
        table.index(['type', 'delay_until'])
    })
}

exports.down = async function(knex) {
    await knex.schema.alterTable('journey_user_step', function(table) {
        table.dropIndex(['type', 'delay_until'])
    })
}
