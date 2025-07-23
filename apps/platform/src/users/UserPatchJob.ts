import App from '../app'
import { User, UserInternalParams } from './User'
import { Job } from '../queue'
import { createUser, getUsersFromIdentity, updateUser } from './UserRepository'
import { ClientIdentity } from '../client/Client'
import { ListVersion } from '../lists/List'
import { addUserToList } from '../lists/ListService'
import { EncodedJob } from '../queue/Job'
import { LockError } from '../core/Lock'

interface UserPatchTrigger {
    project_id: number
    user: UserInternalParams
    options?: {
        join_list?: ListVersion
        skip_list_updating?: boolean
    }
}

export default class UserPatchJob extends Job {
    static $name = 'user_patch'

    static from(data: UserPatchTrigger): UserPatchJob {
        return new this(data)
    }

    static async handler(patch: UserPatchTrigger, raw: EncodedJob): Promise<User> {

        const app = App.main

        const upsert = async (patch: UserPatchTrigger, tries = 3): Promise<User> => {
            const { project_id, user: { external_id, anonymous_id, data, ...fields } } = patch
            const identity = { external_id, anonymous_id } as ClientIdentity

            // Check for existing user
            const { anonymous, external } = await getUsersFromIdentity(project_id, identity)
            const existing = external ?? anonymous

            // If user, update otherwise insert
            try {
                return existing
                    ? await updateUser(existing, patch.user, anonymous)
                    : await createUser(project_id, {
                        ...identity,
                        data,
                        ...fields,
                    })
            } catch (error: any) {

                // If record is locked, re-queue the job
                if (error instanceof LockError) {
                    await app.queue.retry(raw)
                    throw error
                }

                // If there is an error (such as constraints,
                // retry inline up to three times)
                if (tries <= 0) throw error
                return upsert(patch, --tries)
            }
        }

        const user = await upsert(patch)

        const {
            join_list,
        } = patch.options ?? {}

        // If provided a list to join, add user to it
        if (join_list) {
            await addUserToList(user, join_list)
        }

        return user
    }
}
