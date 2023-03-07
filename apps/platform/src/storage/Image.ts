import Model from '../core/Model'
import Storage from './Storage'

export default class Image extends Model {
    project_id!: number
    uuid!: string
    name!: string
    original_name!: string
    extension!: string
    alt!: string
    file_size!: number

    get filename(): string {
        return `${this.uuid}${this.extension}`
    }

    get url(): string {
        return Storage.url(this.filename)
    }

    toJSON() {
        return {
            ...this,
            url: this.url,
        }
    }
}

export interface ImageParams {
    name: string
    alt?: string
}
