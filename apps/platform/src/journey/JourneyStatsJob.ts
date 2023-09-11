import { Job } from '../queue'
import Journey from './Journey'
import { JourneyStep, JourneyUserStep } from './JourneyStep'

interface JourneyStatsParams {
    journey_id: number
}

export default class JourneyStatsJob extends Job {
    static $name = 'journey_stats_job'

    static from(journey_id: number) {
        return new this({ journey_id })
    }

    static async handler({ journey_id }: JourneyStatsParams) {

        journey_id = Number(journey_id)
        if (isNaN(journey_id)) {
            return
        }

        const stats_at = new Date()

        const [steps, counts] = await Promise.all([
            JourneyStep.query()
                .select('id')
                .where('journey_id', journey_id),
            JourneyUserStep.query()
                .select('step_id')
                .sum({
                    entrance: JourneyUserStep.raw('if(entrance_id is null, 1, 0)'),
                    ended: JourneyUserStep.raw('if(entrance_id is null and ended_at is not null, 1, 0)'),
                    completed: JourneyUserStep.raw('if(type = \'completed\', 1, 0)'),
                    error: JourneyUserStep.raw('if(type = \'error\', 1, 0)'),
                    delay: JourneyUserStep.raw('if(type = \'delay\', 1, 0)'),
                    action: JourneyUserStep.raw('if(type = \'action\', 1, 0)'),
                })
                .where('journey_id', journey_id)
                .groupBy('step_id') as Promise<Array<{
                    step_id: number
                    [stat: string]: number
                }>>,
        ])

        // knex returns the sums as strings for some reason
        counts.forEach(o => Object.entries(o).forEach(([stat, count]) => {
            o[stat] = Number(count)
        }))

        await Journey.update(q => q.where('id', journey_id), {
            stats: counts.reduce((a, { step_id, ...rest }) => {
                for (const [stat, count] of Object.entries(rest)) {
                    a[stat] = (a[stat] ?? 0) + count
                }
                return a
            }, {
                entrance: 0,
                ended: 0,
                completed: 0,
                error: 0,
                delay: 0,
                action: 0,
            } as Record<string, number>),
            stats_at,
        })

        for (const step of steps) {
            const { step_id, ...stats } = counts.find(c => c.step_id === step.id) ?? {}
            await JourneyStep.update(q => q.where('id', step.id), {
                stats,
                stats_at,
            })
        }
    }

}
