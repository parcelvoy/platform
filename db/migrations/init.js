exports.up = function(knex) {
    return knex.schema
        .createTable('project', function(table) {
            table.increments()
            table.string('name', 255).defaultTo('')
            table.string('description', 2048).defaultTo('')
            table.timestamp('created_at').defaultTo(knex.fn.now())
            table.timestamp('updated_at').defaultTo(knex.fn.now())
            table.timestamp('deleted_at').nullable()
            table.unique('name')
        })
        .createTable('admin', function(table) {
            table.increments()
            table.string('first_name', 255).notNullable()
            table.string('last_name', 255).notNullable()
            table.string('email', 255).notNullable()
            table.timestamp('created_at').defaultTo(knex.fn.now())
            table.timestamp('updated_at').defaultTo(knex.fn.now())
            table.timestamp('deleted_at').nullable();
        })
        .createTable('admin_project', function(table) {
            table.increments()
            table.integer('admin_id').unsigned().notNullable()
            table.integer('project_id').unsigned().notNullable()
            table.timestamp('created_at').defaultTo(knex.fn.now())
            table.timestamp('deleted_at').nullable()
            table.foreign('admin_id').references('admin.id')
            table.foreign('project_id').references('project.id')
        })
        .createTable('user', function(table) {
            table.increments()
            table.integer('project_id').unsigned().notNullable()
            table.string('external_id', 255).notNullable()
            table.string('email', 255).nullable()
            table.string('phone', 64).nullable()
            table.json('data').notNullable()
            table.timestamp('created_at').defaultTo(knex.fn.now())
            table.timestamp('updated_at').defaultTo(knex.fn.now())
        })
        .createTable('device', function(table) {
            table.increments()
            table.integer('user_id').unsigned().notNullable()
            table.string('token', 2048).notNullable()
            table.string('os', 128).notNullable()
            table.string('model', 255).notNullable()
            table.string('app_build', 255).notNullable()
            table.string('app_version', 255).notNullable()
            table.foreign('user_id')
                .references('user.id')
                .onDelete('CASCADE')
        })
}

exports.down = function(knex) {
    return knex.schema
        .dropTable('device')
        .dropTable('users')
        .dropTable('admin_project')
        .dropTable('admin')
        .dropTable('projects')
}