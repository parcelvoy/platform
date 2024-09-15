import Model, { ModelParams } from '../core/Model'

export type ResourceType = 'font' | 'snippet'

export default class Resource extends Model {
    project_id!: number
    type!: ResourceType
    name!: string
    value!: Record<string, any>

    static jsonAttributes = ['value']
}

export type ResourceParams = Omit<Resource, ModelParams>
