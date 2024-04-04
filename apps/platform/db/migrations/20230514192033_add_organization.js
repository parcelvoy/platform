exports.up = async function(knex) {
    await knex.schema.createTable('organizations', function(table) {
        table.increments()
        table.string('username').unique()
        table.string('domain').index()
        table.json('auth')
        table.timestamp('created_at').defaultTo(knex.fn.now())
        table.timestamp('updated_at').defaultTo(knex.fn.now())
    })

    await knex.schema.table('projects', function(table) {
        table.integer('organization_id')
            .references('id')
            .inTable('organizations')
            .onDelete('CASCADE')
            .unsigned()
            .after('id')
    })

    await knex.schema.table('admins', function(table) {
        table.integer('organization_id')
            .references('id')
            .inTable('organizations')
            .onDelete('CASCADE')
            .unsigned()
            .after('id')
    })

    const admins = await knex('admins').count({ count: '*' }).first()
    if (admins.count > 1) {
        const orgId = await knex('organizations').insert({ id: 1, username: 'local' })
        await knex('projects').update({ organization_id: orgId }).whereNull('organization_id')
        await knex('admins').update({ organization_id: orgId }).whereNull('organization_id')
    }
}

exports.down = async function(knex) {
    await knex.schema.dropTable('organizations')
    await knex.schema.table('projects', function(table) {
        table.dropColumn('organization_id')
    })
    await knex.schema.table('admins', function(table) {
        table.dropColumn('organization_id')
    })
}
