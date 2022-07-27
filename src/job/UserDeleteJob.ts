

import App from "../app";
import { logger } from "../config/logger";
import { ClientDeleteUsersRequest } from "../models/client";
import { Job } from "../queue";

interface UserDeleteTrigger {
    project_id: number
    request: ClientDeleteUsersRequest
}

export default class UserDeleteJob extends Job {
    static $name = 'user_delete'

    static from (data: UserDeleteTrigger): UserDeleteJob {
        return new this(data)
    }

    static async handler({ project_id, request }: UserDeleteTrigger) {

        if (!request.length) {
            logger.debug('received empty user patch request? throw error???') //throw?
            return
        }

        console.log('deleting users: ' + request.join())
        
        await App.main.db.transaction(async trx => trx('user').delete().where({ project_id }).whereIn('external_id', request))

    }
}
