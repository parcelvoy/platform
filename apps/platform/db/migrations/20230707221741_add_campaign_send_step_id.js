exports.up = async function(knex) {
    await knex.schema.alterTable('campaign_sends', function(table) {
        table.integer('user_step_id')
            .unsigned()
            .notNullable()
            .defaultTo(0) // this is 0 so it can be a part of the unique index
        table.dropForeign('user_id')
        table.dropForeign('campaign_id')
        table.dropUnique(['user_id', 'campaign_id'])
        table.unique(['user_id', 'campaign_id', 'user_step_id'])
        table.foreign('user_id')
            .references('id')
            .inTable('users')
            .onDelete('CASCADE')
        table.foreign('campaign_id')
            .references('id')
            .inTable('campaigns')
            .onDelete('CASCADE')
    })
}

exports.down = async function(knex) {
    await knex.schema.alterTable('campaign_sends', function(table) {
        table.dropForeign('user_id')
        table.dropForeign('campaign_id')
        table.dropUnique(['user_id', 'campaign_id', 'user_step_id'])
        table.unique(['user_id', 'campaign_id'])
        table.dropColumn('user_step_id')
        table.foreign('user_id')
            .references('id')
            .inTable('users')
            .onDelete('CASCADE')
        table.foreign('campaign_id')
            .references('id')
            .inTable('campaigns')
            .onDelete('CASCADE')
    })
}
