import Model from '../core/Model'
import { combineURLs } from '../utilities'

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
        return combineURLs([process.env.STORAGE_BASE_URL!, this.filename])
    }

    toJSON() {
        return {
            ...this,
            url: this.url,
        }
    }
}
