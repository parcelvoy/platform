import { User, UserInternalParams } from './User'
import { Job } from '../queue'
import { createUser, getUsersFromIdentity, isUserDirty } from './UserRepository'
import { addUserToList } from '../lists/ListService'
import { ClientIdentity } from '../client/Client'
import UserListMatchJob from '../lists/UserListMatchJob'

interface UserPatchTrigger {
    project_id: number
    user: UserInternalParams
    options?: {
        join_list?: {
            id: number
            version: number
        }
        skip_list_updating?: boolean
    }
}

export default class UserPatchJob extends Job {
    static $name = 'user_patch'

    static from(data: UserPatchTrigger): UserPatchJob {
        return new this(data)
    }

    static async handler(patch: UserPatchTrigger): Promise<User> {
        const upsert = async (patch: UserPatchTrigger, tries = 3): Promise<User> => {
            const { project_id, user: { external_id, anonymous_id, data, ...fields } } = patch
            const identity = { external_id, anonymous_id } as ClientIdentity

            // Check for existing user
            const { anonymous, external } = await getUsersFromIdentity(project_id, identity)
            const existing = external ?? anonymous

            // If user, update otherwise insert
            try {
                return existing
                    ? await User.updateAndFetch(existing.id, {
                        data: data ? { ...existing.data, ...data } : undefined,
                        ...fields,
                        ...!anonymous ? { anonymous_id } : {},
                    })
                    : await createUser(project_id, {
                        ...identity,
                        data,
                        ...fields,
                    })
            } catch (error: any) {
                // If there is an error (such as constraints,
                // retry up to three times)
                if (tries <= 0) throw error
                return upsert(patch, --tries)
            }
        }

        const user = await upsert(patch)

        const {
            join_list,
            skip_list_updating = false,
        } = patch.options ?? {}

        // Use updated user to check for dynamic list membership
        if (!skip_list_updating && isUserDirty(patch.user)) {
            await UserListMatchJob.from(user.id, user.project_id).queue()
        }

        // If provided a list to join, add user to it
        if (join_list) await addUserToList(user, join_list)

        return user
    }
}
