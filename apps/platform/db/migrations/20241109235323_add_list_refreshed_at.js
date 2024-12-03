exports.up = async function(knex) {
    await knex.schema.table('lists', function(table) {
        table.timestamp('refreshed_at')
    })

    const lists = await knex('rules')
        .leftJoin('rules as parent_rules', 'rules.root_uuid', 'parent_rules.uuid')
        .leftJoin('lists', 'lists.rule_id', 'parent_rules.id')
        .where('rules.type', 'date')
        .where('rules.value', 'LIKE', '%now%')
        .where('rules.value', 'LIKE', '%{{%')
        .groupBy('lists.id')
        .select('lists.id')
    await knex('lists')
        .update('refreshed_at', knex.raw('NOW()'))
        .whereIn('id', lists.map(list => list.id))
}

exports.down = async function(knex) {
    await knex.schema.table('lists', function(table) {
        table.dropColumn('refreshed_at')
    })
}
