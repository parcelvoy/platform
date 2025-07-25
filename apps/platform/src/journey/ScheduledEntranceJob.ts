import { Job } from '../queue'
import { JourneyEntrance, JourneyStep } from './JourneyStep'
import JourneyUserStep from './JourneyUserStep'
import { uuid } from '../utilities'
import App from '../app'
import JourneyProcessJob from './JourneyProcessJob'
import Journey from './Journey'
import List from '../lists/List'
import { getRuleQuery } from '../rules/RuleEngine'
import Project from '../projects/Project'
import { logger } from '../config/logger'
import { processUsers } from '../users/ProcessUsers'

interface ScheduledEntranceTrigger {
    entranceId: number
}

export default class ScheduledEntranceJob extends Job {

    static $name = 'scheduled_entrance_job'

    static from(params: ScheduledEntranceTrigger) {
        return new ScheduledEntranceJob(params).deduplicationKey(`${this.$name}_${params.entranceId}`)
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
        if (!list || list.project_id !== journey?.project_id) return

        const project = await Project.find(journey.project_id)

        const query = getRuleQuery(list.project_id, list.rule)
        await processUsers({
            query,
            cacheKey: `journeys:${journey}:entrance:${entrance.id}:users`,
            itemMap: (user) => ({
                key: user.id,
                value: `${user.id}`,
            }),
            callback: async (pairs) => {
                try {
                    const ref = uuid()
                    const items = pairs.map(({ key }) => ({
                        user_id: parseInt(key),
                        type: 'completed',
                        journey_id: entrance.journey_id,
                        step_id: entrance.id,
                        ref,
                    }))
                    await JourneyUserStep.insert(items)

                    const steps = await JourneyUserStep.all(qb => qb.select('id')
                        .where('ref', ref),
                    )

                    await App.main.queue.enqueueBatch(steps.map(({ id }) => JourneyProcessJob.from({ entrance_id: id })))
                } catch (error) {
                    logger.error({ error, journey: journey.id }, 'campaign:generate:progress:error')
                }
            },
            afterCallback: async () => {
                await JourneyStep.update(q => q.where('id', entrance.id), {
                    next_scheduled_at: entrance.nextDate(project?.timezone ?? 'UTC'),
                })
            },
        })
    }
}
