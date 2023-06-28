// eslint-disable-next-line @typescript-eslint/no-var-requires
const crypto = require('crypto')

exports.up = async function(knex) {
    await knex.schema.table('lists', function(table) {
        table.boolean('is_visible').defaultTo(true)
    })

    // Update all existing journey steps to have a list_id
    const gates = await knex('journey_steps').where('type', 'gate')
    for (const gate of gates) {
        const journey = await knex('journeys').where('id', gate.journey_id).first()
        const [id] = await knex('lists').insert({
            project_id: journey.project_id,
            name: crypto.randomUUID(),
            type: 'dynamic',
            state: 'ready',
            rule: JSON.stringify(gate.rule),
            version: 0,
            is_visible: false,
            users_count: 0,
        })
        await knex('journey_steps').update({ data: JSON.stringify({ list_id: id }) }).where('id', gate.id)
    }
}

exports.down = async function(knex) {
    await knex.schema.table('lists', function(table) {
        table.dropColumn('is_visible')
    })
}
