import { Job } from '../queue'
import App from '../app'
import { chunk } from '../utilities'
import { JourneyUserStep } from './JourneyStep'
import Journey from './Journey'
import JourneyProcessJob from './JourneyProcessJob'

interface JourneyDelayJobParams {
    journey_id: number
}

/**
 * A job to be run on a schedule to queue up all journeys that need
 * to be rechecked
 */
export default class JourneyDelayJob extends Job {
    static $name = 'journey_delay_job'

    static async enqueueActive(app: App) {
        const query = Journey.query(app.db).select('id').where('published', true)
        await chunk<{ id: number }>(query, app.queue.batchSize, async journeys => {
            app.queue.enqueueBatch(journeys.map(({ id }) => JourneyDelayJob.from(id)))
        })
    }

    static from(journey_id: number) {
        return new JourneyDelayJob({ journey_id })
    }

    static async handler({ journey_id }: JourneyDelayJobParams) {

        if (!journey_id) return

        const { db, queue } = App.main

        const count = await JourneyUserStep.update(
            q => q
                .where('journey_id', journey_id)
                .where('type', 'delay') // only include steps where the current type/status is 'delay'
                .where('delay_until', '<=', new Date()),
            { type: 'pending' },
        )

        if (count) {
            // maybe this should have a lock?
            const query = JourneyUserStep.query(db)
                .select('id')
                .where('journey_id', journey_id)
                .where('type', 'pending')

            await chunk<{ id: number }>(query, queue.batchSize, async items => {
                await queue.enqueueBatch(items.map(({ id }) => JourneyProcessJob.from({ entrance_id: id })))
            })
        }
    }
}
