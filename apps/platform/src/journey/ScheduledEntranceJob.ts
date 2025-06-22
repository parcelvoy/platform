import { Job } from '../queue'
import { JourneyEntrance } from './JourneyStep'
import JourneyUserStep from './JourneyUserStep'
import { chunk, Chunker, uuid } from '../utilities'
import App from '../app'
import JourneyProcessJob from './JourneyProcessJob'
import Journey from './Journey'
import List from '../lists/List'
import { getRuleQuery } from '../rules/RuleEngine'
import { User } from '../users/User'

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
        const result = await User.clickhouse().query(
            getRuleQuery(list.project_id, list.rule),
        )

        const chunker = new Chunker<Partial<JourneyUserStep>>(async items => {
            await App.main.db.transaction(async (trx) => {
                await JourneyUserStep.query(trx)
                    .insert(items)
            })
        }, 500)

        for await (const chunk of result.stream() as any) {
            for (const result of chunk) {
                const user = result.json()
                chunker.add({
                    user_id: user.id,
                    type: 'completed',
                    journey_id: entrance.journey_id,
                    step_id: entrance.id,
                    ref,
                })
            }
        }

        await chunker.flush()

        const query = JourneyUserStep.query().select('id').where('ref', ref)

        await chunk<{ id: number }>(query, App.main.queue.batchSize, async items => {
            await App.main.queue.enqueueBatch(items.map(({ id }) => JourneyProcessJob.from({ entrance_id: id })))
        })
    }

}
