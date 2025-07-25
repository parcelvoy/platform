import App from '../app'
import { Job } from '../queue'
import { JourneyEntrance } from './JourneyStep'
import ScheduledEntranceJob from './ScheduledEntranceJob'

export default class ScheduledEntranceOrchestratorJob extends Job {

    static $name = 'scheduled_entrance_orchestration_job'

    static async handler() {

        // Look up all scheduler entrances
        const entrances = await JourneyEntrance.all(q => q
            .join('journeys', 'journey_steps.journey_id', '=', 'journeys.id')

            // Exclude journeys that are not live or the root journey
            .where('journeys.status', 'live')
            .whereNull('journeys.parent_id')
            .whereNull('journeys.deleted_at')

            // Filter down the step type to be an entrance
            .where('journey_steps.type', JourneyEntrance.type)
            .whereJsonPath('journey_steps.data', '$.trigger', '=', 'schedule')
            .whereJsonPath('journey_steps.data', '$.multiple', '=', true)
            .whereNotNull('journey_steps.next_scheduled_at')
            .where('journey_steps.next_scheduled_at', '<=', new Date())
            .select('journey_steps.*', 'journeys.project_id'),
        ) as Array<JourneyEntrance & { project_id: number }>

        if (!entrances.length) return

        const jobs: Job[] = []
        for (const entrance of entrances) {
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
