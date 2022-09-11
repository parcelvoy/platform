import { Job } from '../queue'
import { JourneyUserStep } from './JourneyStep'
import { raw } from '../core/Model'
import JourneyProcessJob from './JourneyProcessJob'
import App from '../app'

/**
 * A job to be run on a schedule to queue up all journeys that need
 * to be rechecked
 */
export default class JourneyDelayJob extends Job {
    static $name = 'journey_delay_job'

    static async handler() {
        await JourneyUserStep.query()
            .with(
                'latest_journey_steps',
                raw('SELECT j.*, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY id DESC) AS rn FROM journey_user_step AS j'),
            )
            .select('step_id', 'type', 'journey_id', 'project_id')
            .from('latest_journey_steps')
            .leftJoin('journeys', 'journeys.id', '=', 'latest_journey_steps.journey_id')
            .where({
                rn: 1,
                type: 'delay',
            })
            .stream(async function(stream) {
                for await (const chunk of stream) {

                    // TODO: Room for improvement here by not reprocessing
                    // the entire queue but instead just this step (could
                    // have some downsides through)
                    App.main.queue.enqueue(
                        JourneyProcessJob.from({
                            user_id: chunk.user_id,
                            journey_id: chunk.step_id,
                        }),
                    )
                }
            })
    }
}
