import Model, { ModelParams } from '../core/Model'
import { JourneyStepMap } from './JourneyStep'

export default class Journey extends Model {
    name!: string
    project_id!: number
    description?: string
    deleted_at?: Date

    steps: JourneyStepMap = {}

    static virtualAttributes: string[] = ['steps']
}

export type JourneyParams = Omit<Journey, ModelParams | 'deleted_at'>
export type UpdateJourneyParams = Omit<JourneyParams, 'project_id' | 'deleted_at'>
