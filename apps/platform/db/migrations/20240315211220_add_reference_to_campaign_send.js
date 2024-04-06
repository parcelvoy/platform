exports.up = async function(knex) {
    await knex.schema.alterTable('campaign_sends', function(table) {
        table.string('reference_type')
        table.string('reference_id')
            .notNullable()
            .defaultTo('0')
    })

    await knex.raw('UPDATE campaign_sends SET reference_id = user_step_id, reference_type = "journey"')

    await knex.schema.alterTable('campaign_sends', function(table) {
        table.unique(['user_id', 'campaign_id', 'reference_id'])
        table.dropUnique(['user_id', 'campaign_id', 'user_step_id'])
        table.dropColumn('user_step_id')
    })
}

exports.down = async function(knex) {
    await knex.schema.alterTable('campaign_sends', function(table) {
        table.integer('user_step_id')
            .unsigned()
            .notNullable()
            .defaultTo(0)
        table.unique(['user_id', 'campaign_id', 'user_step_id'])
    })

    await knex.raw('UPDATE campaign_sends SET user_step_id = reference_id')

    await knex.schema.alterTable('campaign_sends', function(table) {
        table.dropUnique(['user_id', 'campaign_id', 'reference_id'])
        table.dropColumn('reference_id')
        table.dropColumn('reference_type')
    })
}
