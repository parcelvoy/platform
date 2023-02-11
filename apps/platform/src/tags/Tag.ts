import Model, { ModelParams } from '../core/Model'

export class Tag extends Model {
    project_id!: number
    name!: string
}

export class EntityTag extends Model {
    entity!: string // table name
    entity_id!: number
    tag_id!: number
}

export type TagParams = Omit<Tag, ModelParams | 'project_id'>
