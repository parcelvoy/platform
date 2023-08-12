exports.up = async function(knex) {
    await knex.schema.alterTable('projects', function(table) {
        table.boolean('link_wrap').defaultTo(0)
    })

    if (process.env.TRACKING_LINK_WRAP) {
        await knex('projects').update({ link_wrap: process.env.TRACKING_LINK_WRAP === 'true' })
    }

    await knex.schema.alterTable('organizations', function(table) {
        table.string('tracking_deeplink_mirror_url', 255)
        table.integer('notification_provider_id')
            .references('id')
            .inTable('providers')
            .onDelete('SET NULL')
            .nullable()
            .unsigned()
    })

    if (process.env.TRACKING_DEEPLINK_MIRROR_URL) {
        await knex('organizations').update({ tracking_deeplink_mirror_url: process.env.TRACKING_DEEPLINK_MIRROR_URL })
    }
}

exports.down = async function(knex) {
    await knex.schema.alterTable('projects', function(table) {
        table.dropColumn('link_wrap')
    })
    await knex.schema.alterTable('organizations', function(table) {
        table.dropColumn('tracking_deeplink_mirror_url')
        table.dropColumn('notification_provider_id')
    })
}
