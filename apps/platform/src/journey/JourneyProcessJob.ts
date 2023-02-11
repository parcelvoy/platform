import { Job } from '../queue'
import { User } from '../users/User'
import JourneyService from './JourneyService'
import { UserEvent } from '../users/UserEvent'

interface JourneyProcessParams {
    user_id: number
    event_id?: number
    journey_id: number
}

export default class JourneyProcessJob extends Job {
    static $name = 'journey_process_job'

    static from(params: JourneyProcessParams): JourneyProcessJob {
        return new this(params)
    }

    static async handler({ user_id, event_id, journey_id }: JourneyProcessParams) {

        const user = await User.find(user_id)
        const event = await UserEvent.find(event_id)
        const service = new JourneyService(journey_id)

        // If not user, break since it must no longer exist
        if (!user) return

        await service.run(user, event)
    }
}
