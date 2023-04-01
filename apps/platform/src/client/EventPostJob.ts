import { getUserFromClientId } from '../users/UserRepository'
import { updateUsersLists } from '../lists/ListService'
import { ClientIdentity, ClientPostEvent } from './Client'
import { Job } from '../queue'
import { updateUsersJourneys } from '../journey/JourneyService'
import { logger } from '../config/logger'
import { createAndFetchEvent } from '../users/UserEventRepository'

interface EventPostTrigger {
    project_id: number
    event: ClientPostEvent
}

export default class EventPostJob extends Job {
    static $name = 'event_post'

    options = {
        delay: 0,
        attempts: 1,
    }

    static from(data: EventPostTrigger): EventPostJob {
        return new this(data)
    }

    static async handler({ project_id, event }: EventPostTrigger) {
        const { anonymous_id, external_id } = event
        const user = await getUserFromClientId(project_id, { anonymous_id, external_id } as ClientIdentity)
        if (!user) {
            logger.error({ project_id, event }, 'job:event_post:unknown-user')
            throw new Error('job:event_post:unknown-user')
        }

        // Create event for given user
        const dbEvent = await createAndFetchEvent(user, {
            name: event.name,
            data: event.data || {},
        })

        // Check to see if a user has any lists
        await updateUsersLists(user, dbEvent)

        // Check all journeys to update progress
        await updateUsersJourneys(user, dbEvent)
    }
}
