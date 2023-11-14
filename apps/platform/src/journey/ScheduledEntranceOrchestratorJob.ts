import App from '../app'
import { Job } from '../queue'
import { JourneyEntrance, JourneyStep } from './JourneyStep'
import ScheduledEntranceJob from './ScheduledEntranceJob'

export default class ScheduledEntranceOrchestratorJob extends Job {

    static $name = 'scheduled_entrance_orchestration_job'

    static async handler() {

        // look up all scheduler entrances
        const entrances = await JourneyEntrance.all(q => q
            .join('journeys', 'journey_steps.journey_id', '=', 'journeys.id')
            .where('journeys.published', true)
            .where('journey_steps.type', JourneyEntrance.type)
            .whereJsonPath('journey_steps.data', '$.trigger', '=', 'schedule')
            .where('journey_steps.next_scheduled_at', '<=', new Date()),
        )

        if (!entrances.length) return

        const jobs: Job[] = []
        for (const entrance of entrances) {

            await JourneyStep.update(q => q.where('id', entrance.id), {
                next_scheduled_at: entrance.nextDate(),
            })

            if (entrance.list_id) {
                jobs.push(ScheduledEntranceJob.from({
                    entranceId: entrance.id,
                }))
            }
        }

        if (jobs.length) {
            await App.main.queue.enqueueBatch(jobs)
        }
    }

}
