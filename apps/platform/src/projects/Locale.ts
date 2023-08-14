import Model, { ModelParams } from '../core/Model'

export default class Locale extends Model {
    project_id!: number
    key!: string
    label!: string
}

export type LocaleParams = Omit<Locale, ModelParams | 'project_id'>
