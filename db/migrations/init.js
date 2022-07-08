exports.up = function(knex) {
    return knex.schema
        .createTable('users', function (table) {
            table.increments()
            table.string('name', 255).defaultTo('')
        })
}

exports.down = function(knex) {
    
}