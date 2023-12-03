exports.up = async function(knex) {
    await knex.raw(`
        UPDATE journey_steps
        SET data = JSON_SET(data, '$.event_name', data->>'$.eventName'),
             data = JSON_REMOVE(data, '$.eventName')
        WHERE \`type\` = 'entrance' AND data->>'$.trigger' = 'event'
    `)
}

exports.down = async function(knex) {
    await knex.raw(`
        UPDATE journey_steps
        SET data = JSON_SET(data, '$.eventName', data->>'$.event_name'),
             data = JSON_REMOVE(data, '$.event_name')
        WHERE \`type\` = 'entrance' AND data->>'$.trigger' = 'event'
    `)
}
