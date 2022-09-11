import { createEvent } from '../users/UserEventRepository'
import { getUserFromExternalId } from '../users/UserRepository'
import { updateLists } from '../lists/ListService'
import { ClientPostEvent } from './Client'
import { Job } from '../queue'
import { updateUserJourneys } from '../journey/JourneyService'

interface EventPostTrigger {
    project_id: number
    event: ClientPostEvent
}

export default class EventPostJob extends Job {
    static $name = 'event_post'

    static from(data: EventPostTrigger): EventPostJob {
        return new this(data)
    }

    static async handler({ project_id, event }: EventPostTrigger) {

        const user = await getUserFromExternalId(project_id, event.user_id)
        if (!user) return // TODO: Maybe log an error somewhere?

        // Create event for given user
        const dbEvent = await createEvent({
            project_id,
            user_id: user.id,
            name: event.name,
            data: event.data || {},
        })

        // Check to see if a user has any lists
        await updateLists(user, dbEvent)

        // Check all journeys to update progress
        await updateUserJourneys(user, dbEvent)
    }
}
