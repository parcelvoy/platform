exports.up = async function(knex) {
    await knex.schema.table('journeys', function(table) {
        table.integer('parent_id')
            .unsigned()
            .nullable()
            .references('id')
            .inTable('journeys')
            .onDelete('CASCADE')
        table.string('status')
    })

    await knex('journeys').update({ status: 'draft' }).where('published', 0)
    await knex('journeys').update({ status: 'live' }).where('published', 1)

    await knex.schema.table('journeys', function(table) {
        table.dropColumn('published')
    })
}

exports.down = async function(knex) {
    await knex.schema.table('journeys', function(table) {
        table.boolean('published')
    })

    await knex('journeys').update({ published: 0 }).where('status', 'draft')
    await knex('journeys').update({ published: 1 }).where('status', 'live')

    await knex.schema.table('journeys', function(table) {
        table.dropColumn('parent_id')
        table.dropColumn('published')
    })
}
