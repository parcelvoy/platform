import Model, { ModelParams } from '../core/Model'
import { JourneyStep } from './JourneyStep'

export default class Journey extends Model {
    name!: string
    project_id!: number
    description?: string
    deleted_at?: Date

    steps: JourneyStep[] = []
}

export type JourneyParams = Omit<Journey, ModelParams | 'steps' | 'deleted_at'>
export type UpdateJourneyParams = Omit<JourneyParams, 'project_id' | 'deleted_at'>
