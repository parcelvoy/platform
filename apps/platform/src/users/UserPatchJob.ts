import { User, UserParams } from './User'
import { Job } from '../queue'
import { createUser, getUserFromClientId } from './UserRepository'
import { addUserToList, updateUsersLists } from '../lists/ListService'
import { updateUsersJourneys } from '../journey/JourneyService'
import { ClientIdentity } from '../client/Client'

interface UserPatchTrigger {
    project_id: number
    user: UserParams
    options?: {
        join_list_id?: number
        skip_list_updating?: boolean
        skip_journey_updating?: boolean
    }
}

export default class UserPatchJob extends Job {
    static $name = 'user_patch'

    static from(data: UserPatchTrigger): UserPatchJob {
        return new this(data)
    }

    static async handler(patch: UserPatchTrigger) {

        const user = await this.upsert(patch)

        const {
            join_list_id,
            skip_list_updating = false,
            skip_journey_updating = false,
        } = patch.options ?? {}

        // Use updated user to check for list membership
        if (!skip_list_updating) {
            await updateUsersLists(user)
        }

        // If provided a list to join, add user to it
        if (join_list_id) {
            await addUserToList(user, join_list_id)
        }

        // Check all journeys to update progress
        if (!skip_journey_updating) {
            await updateUsersJourneys(user)
        }
    }

    static async upsert(patch: UserPatchTrigger, tries = 3): Promise<User> {
        const { project_id, user: { external_id, anonymous_id, data, ...fields } } = patch
        const identity = { external_id, anonymous_id } as ClientIdentity

        // Check for existing user
        const existing = await getUserFromClientId(project_id, identity)

        // If user, update otherwise insert
        try {
            return existing
                ? await User.updateAndFetch(existing.id, {
                    data: data ? { ...existing.data, ...data } : undefined,
                    ...fields,
                })
                : await createUser(project_id, {
                    ...identity,
                    data,
                    ...fields,
                })
        } catch (error: any) {
            // If there is an error (such as constraints, retry)
            return this.upsert(patch, --tries)
        }
    }
}
