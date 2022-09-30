import Model from '../core/Model'

export default class Image extends Model {
    project_id!: number
    uuid!: string
    name!: string
    original_name!: string
    extension!: string
    alt!: string
    file_size!: number
}
