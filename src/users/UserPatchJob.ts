import { User, UserParams } from './User'
import { Job } from '../queue'
import { getUserFromClientId } from './UserRepository'
import { updateUsersLists } from '../lists/ListService'
import { updateUsersJourneys } from '../journey/JourneyService'

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

        // Check for existing user
        const existing = await getUserFromClientId(project_id, { external_id, anonymous_id })

        // If user, update otherwise insert
        const user = existing
            ? await User.updateAndFetch(existing.id, {
                data: data ? { ...existing.data, ...data } : undefined,
                ...fields,
            })
            : await User.insertAndFetch({
                project_id,
                anonymous_id,
                external_id,
                data: data ?? {},
                ...fields,
            })

        // Use updated user to check for list membership
        await updateUsersLists(user)

        // Check all journeys to update progress
        await updateUsersJourneys(user)
    }
}
