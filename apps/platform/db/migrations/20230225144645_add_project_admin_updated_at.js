exports.up = function(knex) {
    return knex.schema
        .table('project_admins', function(table) {
            table.timestamp('updated_at')
                .after('created_at')
                .defaultTo(knex.fn.now())
        })
}

exports.down = function(knex) {
    return knex.schema
        .table('project_admins', function(table) {
            table.dropColumn('updated_at')
        })
}
