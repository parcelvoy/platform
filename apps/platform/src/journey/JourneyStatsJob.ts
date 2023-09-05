import { Job } from '../queue'
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
            await JourneyStep.query()
                .select('id')
                .where('journey_id', journey_id),
            await JourneyUserStep.query()
                .select('step_id', 'type')
                .count('id as cnt')
                .where('journey_id', journey_id)
                .groupBy(['step_id', 'type']),
        ])

        for (const step of steps) {
            await JourneyStep.update(qb => qb.where('id', step.id), {
                stats: counts.reduce<Record<string, number>>((a, { step_id, type, cnt }) => {
                    if (step.id === step_id) {
                        a[type] = cnt
                    }
                    return a
                }, {}),
                stats_at,
            })
        }
    }

}
