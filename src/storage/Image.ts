import Model from '../core/Model'

export default class Image extends Model {
    uuid!: string
    name!: string
    original_name!: string
    extension!: string
    alt!: string
    file_size!: number
}
