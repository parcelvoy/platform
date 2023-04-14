import { Job } from '../queue'
import { aliasUser } from './UserRepository'
import { ClientAliasParams } from '../client/Client'

type UserAliasTrigger = ClientAliasParams & {
    project_id: number
}

export default class UserAliasJob extends Job {
    static $name = 'user_alias'

    static from(data: UserAliasTrigger): UserAliasJob {
        return new this(data)
    }

    static async handler({ project_id, ...alias }: UserAliasTrigger) {
        await aliasUser(project_id, alias)
    }
}
