
import { logger } from "../config/logger";
import { ClientPostEventsRequest } from "../models/client";
import { Job } from "../queue";

interface EventPostTrigger {
    project_id: number
    request: ClientPostEventsRequest
}

export default class EventPostJob extends Job {
    static $name = 'event_post'

    static from (data: EventPostTrigger): EventPostJob {
        return new this(data)
    }

    static async handler({ project_id, request }: EventPostTrigger) {

        if (!request.length) {
            logger.debug('received empty user patch request? throw error???') //throw?
            return
        }
        
        //TODO handle events...
        console.log(`project ${project_id} received events: ${JSON.stringify(request)}`)

    }
}
