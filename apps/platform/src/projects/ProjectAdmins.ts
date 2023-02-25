import Model from '../core/Model'

export default class ProjectAdmin extends Model {

    project_id!: number
    admin_id?: number
    deleted_at?: Date
}
