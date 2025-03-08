exports.up = async function(knex) {
    await knex.schema.alterTable('campaign_sends', table => {
        table.integer('id').alter()
    })

    await knex.raw('alter table campaign_sends drop primary key')

    await knex.schema.alterTable('campaign_sends', table => {
        table.dropColumn('id')
    })

    await knex.raw('alter table campaign_sends add primary key (campaign_id, user_id, reference_id)')

    await knex.schema.alterTable('campaign_sends', table => {
        table.index('user_id', 'campaign_sends_user_id_foreign')
        table.dropUnique(['user_id', 'campaign_id', 'reference_id'])
    })
}

exports.down = async function(knex) {
    await knex.schema.alterTable('campaign_sends', table => {
        table.unique(['user_id', 'campaign_id', 'reference_id'])
    })

    await knex.raw('alter table campaign_sends drop primary key')

    await knex.schema.alterTable('campaign_sends', table => {
        table.increments('id')
    })

    await knex.raw('alter table campaign_sends add primary key (id)')
}
