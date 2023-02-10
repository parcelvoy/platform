exports.up = function(knex) {
    return knex.schema
        .table('projects', function(table) {
            table.string('timezone', 50)
        })
}

exports.down = function(knex) {
    return knex.schema
        .table('projects', function(table) {
            table.dropColumn('timezone')
        })
}
