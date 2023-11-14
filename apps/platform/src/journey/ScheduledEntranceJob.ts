import { Job } from '../queue'
import { JourneyEntrance, JourneyUserStep } from './JourneyStep'
import { chunk, uuid } from '../utilities'
import App from '../app'
import JourneyProcessJob from './JourneyProcessJob'
import Journey from './Journey'
import List from '../lists/List'

interface ScheduledEntranceTrigger {
    entranceId: number
}

export default class ScheduledEntranceJob extends Job {

    static $name = 'scheduled_entrance_job'

    static from(params: ScheduledEntranceTrigger) {
        return new ScheduledEntranceJob(params)
    }

    static async handler({ entranceId }: ScheduledEntranceTrigger) {

        const entrance = await JourneyEntrance.find(entranceId)

        if (!entrance || entrance.type !== JourneyEntrance.type || !entrance.list_id) {
            return
        }

        const [journey, list] = await Promise.all([
            Journey.find(entrance.journey_id),
            List.find(entrance.list_id),
        ])

        if (!list || list.project_id !== journey?.project_id) {
            return // bad list id or project mismatch
        }

        const ref = uuid()

        await App.main.db.raw(`
            insert into journey_user_step (user_id, type, journey_id, step_id, ref)
            select user_id, 'completed', ?, ?, ?
            from user_list
            where list_id = ?
        `, [entrance.journey_id, entrance.id, ref, list.id])

        const query = JourneyUserStep.query().select('id').where('ref', ref)

        await chunk<{ id: number }>(query, App.main.queue.batchSize, async items => {
            await App.main.queue.enqueueBatch(items.map(({ id }) => JourneyProcessJob.from({ entrance_id: id })))
        })
    }

}
