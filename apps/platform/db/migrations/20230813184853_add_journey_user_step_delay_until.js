/* eslint-disable @typescript-eslint/no-var-requires */
const dateFns = require('date-fns')
const dateFnsTz = require('date-fns-tz')

exports.up = async function(knex) {
    await knex.schema.alterTable('journey_user_step', function(table) {
        table.timestamp('delay_until')
    })

    const delayedUserSteps = knex
        .with(
            'latest_journey_steps',
            knex.raw(`
                select
                    us.id as 'id',
                    us.created_at as 'created_at',
                    us.type as 'type',
                    s.data as 'data',
                    coalesce(u.timezone, p.timezone) as 'tz',
                    row_number() over (partition by us.user_id, us.journey_id order by us.id desc) as 'rn'
                from journey_user_step us
                    left join journey_steps s on us.step_id = s.id
                    left join users u on us.user_id = u.id
                    left join projects p on u.project_id = p.id
            `),
        )
        .select('*')
        .from('latest_journey_steps')
        .where({
            rn: 1,
            type: 'delay',
        })
        .stream()

    for await (const { id, created_at, data, tz } of delayedUserSteps) {

        let delay_until = dateFns.parse(created_at)

        if (data?.format === 'duration') {

            delay_until = dateFns.addMinutes(delay_until, ((data?.days ?? 0) * 1440) + ((data?.hours ?? 0) * 60) + ((data?.minutes ?? 0)))

        } else if (data?.format === 'time' && data.time) {

            if (tz) delay_until = dateFnsTz.utcToZonedTime(delay_until, tz)
            delay_until = dateFns.parse(data.time.trim(), 'HH:mm', delay_until)
            if (tz) delay_until = dateFnsTz.zonedTimeToUtc(delay_until, tz)

        } else if (data?.format === 'date' && data.date) {

            delay_until = new Date(data.date)
            if (tz) delay_until = dateFnsTz.zonedTimeToUtc(delay_until, tz)

        }

        await knex('journey_user_step').update({ delay_until }).where('id', id)
    }
}

exports.down = async function(knex) {
    await knex.schema.alterTable('journey_user_step', function(table) {
        table.dropColumn('delay_until')
    })
}
