import { Job } from '../queue'
import Journey from './Journey'
import { JourneyState } from './JourneyState'
import JourneyUserStep from './JourneyUserStep'

interface JourneyProcessParams {
    entrance_id: number
}

export default class JourneyProcessJob extends Job {
    static $name = 'journey_process_job'

    static from(params: JourneyProcessParams): JourneyProcessJob {
        return new this(params)
    }

    static async handler({ entrance_id }: JourneyProcessParams) {

        const entrance = await JourneyUserStep.find(entrance_id)
        if (!entrance) return

        // Make sure journey is still active
        const exists = await Journey.exists(
            qb => qb.where('id', entrance.journey_id)
                .whereNot('status', 'off')
                .whereNull('deleted_at'),
        )
        if (!exists) return

        await JourneyState.resume(entrance)
    }
}
