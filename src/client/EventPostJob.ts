import { createEvent } from '../users/UserEventRepository'
import { getUserFromClientId } from '../users/UserRepository'
import { updateLists } from '../lists/ListService'
import { ClientPostEvent } from './Client'
import { Job } from '../queue'
import { updateUserJourneys } from '../journey/JourneyService'
import { logger } from '../config/logger'

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
        const user = await getUserFromClientId(project_id, event.external_id)
        if (!user) {
            logger.error({ project_id, event }, 'job:event_post:unknown-user')
            return
        }

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
