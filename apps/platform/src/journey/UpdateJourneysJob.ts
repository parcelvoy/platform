import { chunk } from '../utilities'
import { Job } from '../queue'
import Journey from './Journey'
import App from '../app'
import JourneyStatsJob from './JourneyStatsJob'

export default class UpdateJourneysJob extends Job {
    static $name = 'update_journeys_job'

    static async handler() {

        const { db, queue } = App.main

        await chunk<Journey>(Journey.query(db), queue.batchSize, async journeys => {
            queue.enqueueBatch(journeys.map(({ id }) => JourneyStatsJob.from(id)))
        })
    }
}
