import { User, UserParams } from './User'
import { Job } from '../queue'
import { createUser, getUserFromClientId } from './UserRepository'
import { updateUsersLists } from '../lists/ListService'
import { updateUsersJourneys } from '../journey/JourneyService'
import { ClientIdentity } from '../client/Client'

interface UserPatchTrigger {
    project_id: number
    user: UserParams
}

export default class UserPatchJob extends Job {
    static $name = 'user_patch'

    static from(data: UserPatchTrigger): UserPatchJob {
        return new this(data)
    }

    static async handler({ project_id, user: { external_id, anonymous_id, data, ...fields } }: UserPatchTrigger) {

        const identity = { external_id, anonymous_id } as ClientIdentity

        // Check for existing user
        const existing = await getUserFromClientId(project_id, identity)

        // If user, update otherwise insert
        const user = existing
            ? await User.updateAndFetch(existing.id, {
                data: data ? { ...existing.data, ...data } : undefined,
                ...fields,
            })
            : await createUser(project_id, {
                ...identity,
                data,
                ...fields,
            })

        // Use updated user to check for list membership
        await updateUsersLists(user)

        // Check all journeys to update progress
        await updateUsersJourneys(user)
    }
}
