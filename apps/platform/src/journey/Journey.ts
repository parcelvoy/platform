import Model, { ModelParams } from '../core/Model'

export default class Journey extends Model {
    name!: string
    project_id!: number
    description?: string
    published!: boolean
    deleted_at?: Date
    tags?: string[]
}

export type JourneyParams = Omit<Journey, ModelParams | 'deleted_at'>
export type UpdateJourneyParams = Omit<JourneyParams, 'project_id'>
