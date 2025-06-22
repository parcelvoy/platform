import { subDays } from 'date-fns'
import App from '../app'
import { Job } from '../queue'
import { chunk } from '../utilities'
import Journey from './Journey'
import { JourneyUserStep } from './JourneyStep'

interface JourneyCleanupJobParams {
    journey_id: number
}

export default class JourneyCleanupJob extends Job {
    static $name = 'journey_cleanup_job'

    static from(journey_id: number) {
        return new JourneyCleanupJob({ journey_id })
    }

    static async handler({ journey_id }: JourneyCleanupJobParams) {

        if (!journey_id) return

        const { queue } = App.main

        const query = JourneyUserStep.query()
            .where('journey_id', journey_id)
            .where('type', 'completed')
            .whereNull('entrance_id')
            .whereNotNull('ended_at')
            .where('ended_at', '<=', subDays(Date.now(), 7))

        await chunk<Journey>(query, queue.batchSize, async steps => {
            for (const step of steps) {
                await JourneyUserStep.update(
                    q => q.where('entrance_id', step.id),
                    { data: null },
                )
            }
        })
    }
}
