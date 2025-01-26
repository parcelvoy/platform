import App from '../app'
import { getProject } from '../projects/ProjectService'
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
            .whereNull('journeys.deleted_at')
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

            const project = await getProject(entrance.project_id)
            await JourneyStep.update(q => q.where('id', entrance.id), {
                next_scheduled_at: entrance.nextDate(project?.timezone ?? 'UTC'),
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
