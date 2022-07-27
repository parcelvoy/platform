import App from "../app";
import { User } from "../models/User";
import { logger } from "../config/logger";
import { ClientPatchUsersRequest } from "../models/client";
import { Job } from "../queue";

interface UserPatchTrigger {
    project_id: number
    request: ClientPatchUsersRequest
}

export default class UserPatchJob extends Job {
    static $name = 'user_patch'

    static from (data: UserPatchTrigger): UserPatchJob {
        return new this(data)
    }

    static async handler({ project_id, request }: UserPatchTrigger) {

        if (!request.length) {
            logger.debug('received empty user patch request? throw error???') //throw?
            return
        }
        
        await App.main.db.transaction(async trx => {

            const existing = await trx('user')
                .where('project_id', project_id)
                .whereIn('external_id', request.map(u => u.external_id))
                .then(list => list.map(u => new User(u)))

            //can we do 'upsert'-style for this in a way that's supported by all DB types that knex supports?
            for (const { external_id, data = {}, ...fields } of request) {
                const user = existing.find(u => u.external_id === external_id)
                if (user) {
                    await trx('user').update({
                        data: data ? JSON.stringify({ ...user.data, ...data }) : undefined,
                        ...fields
                    }).where({ external_id })
                } else {
                    await trx('user').insert({
                        project_id,
                        external_id,
                        data: JSON.stringify(data),
                        ...fields
                    })
                }
            }

        })


    }
}
