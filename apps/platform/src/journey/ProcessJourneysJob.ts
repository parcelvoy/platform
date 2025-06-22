import { chunk } from '../utilities'
import { Job } from '../queue'
import Journey from './Journey'
import App from '../app'
import JourneyStatsJob from './JourneyStatsJob'
import JourneyCleanupJob from './JourneyCleanupJob'

export default class ProcessJourneysJob extends Job {
    static $name = 'process_journeys_job'

    static async handler() {

        const { db, queue } = App.main

        await chunk<Journey>(Journey.query(db), queue.batchSize, async journeys => {
            const jobs = []
            for (const journey of journeys) {
                jobs.push(JourneyStatsJob.from(journey.id))
                jobs.push(JourneyCleanupJob.from(journey.id))
            }
            await queue.enqueueBatch(jobs)
        })
    }
}
