exports.up = function(knex) {
    return knex.schema
        .createTable('projects', function(table) {
            table.increments()
            table.string('name', 255).defaultTo('')
            table.string('description', 2048).defaultTo('')
            table.timestamp('created_at').defaultTo(knex.fn.now())
            table.timestamp('updated_at').defaultTo(knex.fn.now())
            table.timestamp('deleted_at').nullable()
            table.index('name')
        })
        .createTable('admins', function(table) {
            table.increments()
            table.string('first_name', 255).notNullable()
            table.string('last_name', 255).notNullable()
            table.string('email', 255).notNullable()
            table.timestamp('created_at').defaultTo(knex.fn.now())
            table.timestamp('updated_at').defaultTo(knex.fn.now())
            table.timestamp('deleted_at').nullable()
        })
        .createTable('project_admins', function(table) {
            table.increments()
            table.integer('project_id')
                .unsigned()
                .notNullable()
                .references('id')
                .inTable('projects')
                .onDelete('CASCADE')
            table.integer('admin_id')
                .unsigned()
                .notNullable()
                .references('id')
                .inTable('admins')
                .onDelete('CASCADE')
            table.timestamp('created_at').defaultTo(knex.fn.now())
            table.timestamp('updated_at').defaultTo(knex.fn.now())
            table.timestamp('deleted_at').nullable()
        })
        .createTable('users', function(table) {
            table.increments()
            table.integer('project_id')
                .unsigned()
                .notNullable()
                .references('id')
                .inTable('projects')
                .onDelete('CASCADE')
            table.string('anonymous_id')
            table.string('external_id', 255).notNullable()
            table.string('email', 255).nullable()
            table.string('phone', 64).nullable()
            table.json('data')
            table.json('devices')
            table.timestamp('created_at').defaultTo(knex.fn.now())
            table.timestamp('updated_at').defaultTo(knex.fn.now())
            table.unique(['project_id', 'external_id'])
            table.unique(['project_id', 'anonymous_id'])
        })
        .createTable('project_api_keys', function(table) {
            table.increments()
            table.integer('project_id')
                .unsigned()
                .notNullable()
                .references('id')
                .inTable('projects')
                .onDelete('CASCADE')
            table.string('value', 255).notNullable()
            table.string('scope', 20)
            table.string('name', 255).notNullable()
            table.string('description', 2048).nullable()
            table.timestamp('created_at').defaultTo(knex.fn.now())
            table.timestamp('updated_at').defaultTo(knex.fn.now())
            table.timestamp('deleted_at').nullable()
            table.unique(['value'])
        })
}

exports.down = function(knex) {
    return knex.schema
        .dropTable('users')
        .dropTable('project_admins')
        .dropTable('admins')
        .dropTable('project_api_keys')
        .dropTable('projects')
}
