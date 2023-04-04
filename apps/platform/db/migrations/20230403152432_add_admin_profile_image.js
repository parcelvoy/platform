exports.up = async function(knex) {
    await knex.schema.table('admins', function(table) {
        table.string('image_url', 255).after('email')
    })
}

exports.down = async function(knex) {
    await knex.schema.table('admins', function(table) {
        table.dropColumn('image_url')
    })
}
