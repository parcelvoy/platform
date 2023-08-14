import { Job } from '../queue'
import JourneyProcessJob from './JourneyProcessJob'
import App from '../app'

/**
 * A job to be run on a schedule to queue up all journeys that need
 * to be rechecked
 */
export default class JourneyDelayJob extends Job {
    static $name = 'journey_delay_job'

    static async handler() {

        await App.main.db
            .with(
                'latest_journey_steps',
                App.main.db.raw('select j.*, row_number() over (partition by user_id, journey_id order by id desc) as rn from journey_user_step as j'),
            )
            .from('latest_journey_steps')
            .leftJoin('journeys', 'journeys.id', '=', 'latest_journey_steps.journey_id')
            .where('rn', 1)
            .where('type', 'delay')
            .where('delay_until', '<=', Date.now())
            .stream(async stream => {

                let chunk: Job[] = []

                for await (const { journey_id, user_id } of stream) {
                    chunk.push(JourneyProcessJob.from({
                        user_id,
                        journey_id,
                    }))
                    if (chunk.length >= App.main.queue.batchSize) {
                        await App.main.queue.enqueueBatch(chunk)
                        chunk = []
                    }
                }

                if (chunk.length) {
                    await App.main.queue.enqueueBatch(chunk)
                }
            })
    }
}
