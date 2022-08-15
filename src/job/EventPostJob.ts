
import { logger } from "../config/logger";
import { ClientPostEvent } from "../models/client";
import { Job } from "../queue";

interface EventPostTrigger {
    project_id: number
    event: ClientPostEvent
}

export default class EventPostJob extends Job {
    static $name = 'event_post'

    static from (data: EventPostTrigger): EventPostJob {
        return new this(data)
    }

    static async handler({ project_id, event }: EventPostTrigger) {

        //TODO handle events
        logger.debug('project ' + project_id + ' received event: ' + JSON.stringify(event))

    }
}
