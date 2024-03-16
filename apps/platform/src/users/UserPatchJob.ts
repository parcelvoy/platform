import { User, UserParams } from './User'
import { Job } from '../queue'
import { createUser, getUsersFromIdentity } from './UserRepository'
import { addUserToList, getList, updateUsersLists } from '../lists/ListService'
import { ClientIdentity } from '../client/Client'
import { matchingRulesForUser } from '../rules/RuleService'

interface UserPatchTrigger {
    project_id: number
    user: UserParams
    options?: {
        join_list_id?: number
        skip_list_updating?: boolean
    }
}

export default class UserPatchJob extends Job<User> {
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

            // TODO: Utilize phone and email as backup identifiers
            // to decrease the likelihood of future duplicates

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
            join_list_id,
            skip_list_updating = false,
        } = patch.options ?? {}

        // Use updated user to check for list membership
        if (!skip_list_updating) {
            const results = await matchingRulesForUser(user)
            await updateUsersLists(user, results)
        }

        // If provided a list to join, add user to it
        if (join_list_id) {
            const list = await getList(join_list_id, patch.project_id)
            if (list) await addUserToList(user, list)
        }

        return user
    }
}
