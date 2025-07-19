exports.up = async function(knex) {
    await knex.schema
        .createTable('devices', function(table) {
            table.increments()
            table.integer('project_id')
                .unsigned()
                .notNullable()
                .references('id')
                .inTable('projects')
                .onDelete('CASCADE')
            table.integer('user_id')
                .unsigned()
                .notNullable()
                .references('id')
                .inTable('users')
                .onDelete('CASCADE')
            table.string('device_id', 255).notNullable()
            table.string('token', 255)
            table.string('os')
            table.string('os_version')
            table.string('model')
            table.string('app_version')
            table.string('app_build')
            table.timestamp('created_at').defaultTo(knex.fn.now())
            table.timestamp('updated_at').defaultTo(knex.fn.now())

            table.unique(['project_id', 'token'])
            table.unique(['project_id', 'device_id'])
        })

    await knex.schema.table('users', function(table) {
        table.boolean('has_push_device').defaultTo(0)
    })
}

exports.down = async function(knex) {
    await knex.schema.dropTable('devices')
    await knex.schema.table('users', function(table) {
        table.dropColumn('has_push_device')
    })
}
