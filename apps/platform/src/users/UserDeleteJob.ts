import App from '../app'
import { Job } from '../queue'

interface UserDeleteTrigger {
    project_id: number
    external_id: string
}

export default class UserDeleteJob extends Job {
    static $name = 'user_delete'

    static from(data: UserDeleteTrigger): UserDeleteJob {
        return new this(data)
    }

    static async handler({ project_id, external_id }: UserDeleteTrigger) {

        await App.main.db.transaction(async trx =>
            trx('users')
                .where({ project_id, external_id })
                .delete(),
        )
    }
}
