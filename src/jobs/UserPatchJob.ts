import App from "../app";
import { User } from "../models/User";
import { ClientPatchUser } from "../models/client";
import { Job } from "../queue";

interface UserPatchTrigger {
    project_id: number
    user: ClientPatchUser
}

export default class UserPatchJob extends Job {
    static $name = 'user_patch'

    static from (data: UserPatchTrigger): UserPatchJob {
        return new this(data)
    }

    static async handler({ project_id, user: { external_id, data, ...fields } }: UserPatchTrigger) {
        
        await App.main.db.transaction(async trx => {

            const existing = await trx('users')
                .where('project_id', project_id)
                .where('external_id', external_id)
                .first()
                .then(r => new User(r))

            if (existing) {
                await trx('users')
                    .update({
                        data: data ? JSON.stringify({ ...existing.data, ...data }) : undefined,
                        ...fields
                    })
                    .where({ external_id })
            } else {
                await trx('users')
                    .insert({
                        project_id,
                        external_id,
                        data: JSON.stringify(data),
                        ...fields
                    })
            }

        })


    }
}
