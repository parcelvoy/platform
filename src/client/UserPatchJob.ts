import { User } from '../users/User'
import { ClientPatchUser } from './Client'
import { Job } from '../queue'
import { getUserFromExternalId } from '../users/UserRepository'
import { updateLists } from '../lists/ListService'
import { updateUserJourneys } from '../journey/JourneyService'

interface UserPatchTrigger {
    project_id: number
    user: ClientPatchUser
}

export default class UserPatchJob extends Job {
    static $name = 'user_patch'

    static from(data: UserPatchTrigger): UserPatchJob {
        return new this(data)
    }

    static async handler({ project_id, user: { external_id, data, ...fields } }: UserPatchTrigger) {

        // Check for existing user
        const existing = await getUserFromExternalId(project_id, external_id)

        // If user, update otherwise insert
        const user = existing
            ? await User.updateAndFetch(existing.id, {
                data: data ? { ...existing.data, ...data } : undefined,
                ...fields,
            })
            : await User.insertAndFetch({
                project_id,
                external_id,
                data,
                ...fields,
            })

        // Use updated user to check for list membership
        await updateLists(user)

        // Check all journeys to update progress
        await updateUserJourneys(user)
    }
}
