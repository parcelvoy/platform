exports.up = async function(knex) {
    await knex('lists').update({ users_count: null })
}

exports.down = async function(knex) {
    await knex('lists').update({ users_count: null })
}
