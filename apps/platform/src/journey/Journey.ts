import Model, { ModelParams } from '../core/Model'
import { setJourneyStepMap } from './JourneyRepository'
import { JourneyStepMap } from './JourneyStep'

export default class Journey extends Model {
    name!: string
    project_id!: number
    description?: string
    published!: boolean
    deleted_at?: Date
    tags?: string[]
    stats?: Record<string, number>
    stats_at?: Date

    static jsonAttributes = ['stats']

    static async create(project_id: number, name: string, stepMap: JourneyStepMap) {
        const journey = await this.insertAndFetch({
            project_id,
            name,
            published: true,
        })
        const { steps, children } = await setJourneyStepMap(journey.id, stepMap)
        return { journey, steps, children }
    }
}

export type JourneyParams = Omit<Journey, ModelParams | 'deleted_at' | 'stats' | 'stats_at'>
export type UpdateJourneyParams = Omit<JourneyParams, 'project_id'>
