import { AuthConfig } from '../auth/Auth'
import Model from '../core/Model'

export default class Organization extends Model {
    username!: string
    domain!: string
    auth!: AuthConfig

    static jsonAttributes = ['auth']
}
