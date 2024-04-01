import { Job } from '../queue'
import Journey from './Journey'
import { JourneyState } from './JourneyState'
import { JourneyUserStep } from './JourneyStep'

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

        // invalid entrance id
        if (!entrance) {
            return
        }

        // make sure journey is still active
        if (!await Journey.exists(qb => qb.where('id', entrance.journey_id).where('published', true))) {
            return
        }

        await JourneyState.resume(entrance)
    }
}
