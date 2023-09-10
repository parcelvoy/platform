exports.up = async function(knex) {
    await knex.schema.alterTable('journey_steps', function(table) {
        table.string('data_key').nullable()
        table.json('stats')
        table.timestamp('stats_at').nullable()
    })
    await knex.schema.alterTable('journey_user_step', function(table) {
        table.integer('entrance_id')
            .unsigned()
            .nullable()
            .references('id')
            .inTable('journey_user_step')
            .onDelete('CASCADE')
        table.timestamp('ended_at').nullable()
        table.json('data')
        table.string('ref', 64).nullable()
    })

    // link steps to entrances
    await knex.raw(`
        update journey_user_step s
        join (
            select
                min(id) as entrance_id,
                user_id,
                journey_id
            from journey_user_step
            group by user_id, journey_id
        ) as s2 on (s.user_id = s2.user_id and s.journey_id = s2.journey_id)
        set s.entrance_id = (
            case
                when s.id = s2.entrance_id then null
                else s2.entrance_id
            end
        );
    `)

    // copy gate step rules back from lists
    await knex.raw(`
        update journey_steps s
            inner join lists l on s.data->'$.list_id' = l.id
        set s.data = json_object('rule', l.rule)
        where s.type = 'gate' and l.rule is not null;
    `)
}

exports.down = async function(knex) {
    await knex.schema.alterTable('journey_steps', function(table) {
        table.dropColumn('data_key')
        table.dropColumn('stats')
    })
    await knex.schema.alterTable('journey_user_step', function(table) {
        table.dropColumn('entrance_id')
        table.dropColumn('ended_at')
        table.dropColumn('data')
        table.dropColumn('ref')
    })
}
