import { Job } from '../queue'
import JourneyProcessJob from './JourneyProcessJob'
import App from '../app'
import { chunk } from '../utilities'
import { JourneyUserStep } from './JourneyStep'

/**
 * A job to be run on a schedule to queue up all journeys that need
 * to be rechecked
 */
export default class JourneyDelayJob extends Job {
    static $name = 'journey_delay_job'

    static async handler() {

        const { db, queue } = App.main

        const query = JourneyUserStep.query(db)
            .distinct(db.raw('ifnull(journey_user_step.entrance_id, journey_user_step.id)'))
            .leftJoin('journeys', 'journeys.id', '=', 'journey_user_step.journey_id')
            .where('journeys.published', true) // ignore inactive journeys
            .where('journey_user_step.type', 'delay') // only include steps where the current type/status is 'delay'
            .where('journey_user_step.delay_until', '<=', new Date())

        await chunk<{ entrance_id: number }>(query, queue.batchSize, async items => {
            await queue.enqueueBatch(items.map(({ entrance_id }) => {
                return JourneyProcessJob.from({ entrance_id })
            }))
        })
    }
}
