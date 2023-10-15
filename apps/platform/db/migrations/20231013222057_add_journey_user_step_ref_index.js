exports.up = async function(knex) {
    await knex.schema
        .alterTable('journey_user_step', function(table) {
            table.index('ref')
        })
        .alterTable('journey_steps', function(table) {
            table.timestamp('next_scheduled_at').nullable()
        })
}

exports.down = async function(knex) {
    await knex.schema
        .alterTable('journey_user_step', function(table) {
            table.dropIndex('ref')
        })
        .alterTable('journey_steps', function(table) {
            table.dropColumn('next_scheduled_at')
        })
}
