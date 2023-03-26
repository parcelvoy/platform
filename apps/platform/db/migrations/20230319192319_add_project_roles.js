exports.up = function(knex) {
    return knex.schema
        .alterTable('project_admins', function(table) {
            table.string('role', 64).notNullable().defaultTo('support')
        })
        .alterTable('project_api_keys', function(table) {
            table.string('role', 64).notNullable().defaultTo('support')
        })
}

exports.down = function(knex) {
    return knex.schema
        .alterTable('project_admins', function(table) {
            table.dropColumn('role')
        })
        .alterTable('project_api_keys', function(table) {
            table.dropColumn('role')
        })
}
