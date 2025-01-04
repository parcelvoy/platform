import { getUser, getUserFromClientId } from '../users/UserRepository'
import { updateUsersLists } from '../lists/ListService'
import { ClientIdentity, ClientPostEvent } from './Client'
import { Job } from '../queue'
import { createAndFetchEvent } from '../users/UserEventRepository'
import { matchingRulesForEvent } from '../rules/RuleService'
import { enterJourneysFromEvent } from '../journey/JourneyService'
import { UserPatchJob } from '../jobs'
import { User } from '../users/User'

interface EventPostTrigger {
    project_id: number
    user_id?: number
    event: ClientPostEvent
    forward?: boolean
}

export default class EventPostJob extends Job {
    static $name = 'event_post'

    options = {
        delay: 0,
        attempts: 2,
    }

    static from(data: EventPostTrigger): EventPostJob {
        return new this(data)
    }

    static async handler({ project_id, user_id, event, forward = false }: EventPostTrigger) {
        const { anonymous_id, external_id } = event
        const identity = { external_id, anonymous_id } as ClientIdentity
        let user = user_id
            ? await getUser(user_id, project_id)
            : await getUserFromClientId(project_id, identity)

        // If no user exists, create one if we have enough information
        if (!user || event.user) {
            user = await UserPatchJob.from({
                project_id,
                user: { ...(event.user ?? {}), ...identity },
            }).handle<User>()
        }

        // Create event for given user
        const dbEvent = await createAndFetchEvent(user, {
            name: event.name,
            data: event.data || {},
        }, forward)

        const results = await matchingRulesForEvent(user, dbEvent)

        // Check to see if a user has any lists
        await updateUsersLists(user, results, dbEvent)

        // Enter any journey entrances associated with this event
        await enterJourneysFromEvent(dbEvent, user)

        return { user, event: dbEvent }
    }
}
