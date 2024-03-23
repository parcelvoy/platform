exports.up = async function(knex) {
    await knex.schema.alterTable('journey_step_child', function(table) {
        table.string('path', 128)
    })
    await knex.raw(`
        update journey_step_child sc
            inner join journey_steps s on sc.step_id = s.id
        set sc.path = 'yes'
        where s.type = 'gate' and priority = 0;
    `)
    await knex.raw(`
        update journey_step_child sc
            inner join journey_steps s on sc.step_id = s.id
        set sc.path = 'no'
        where s.type = 'gate' and priority > 0;
    `)
}

exports.down = async function(knex) {
    await knex.schema.alterTable('journey_step_child', function(table) {
        table.dropColumn('path')
    })
}
