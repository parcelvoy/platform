import { JourneyUserStep } from '../journey/JourneyStep'
import { enterAllUnstartedJourneysFromList } from '../journey/JourneyService'
import { Job } from '../queue'
import { DynamicList } from './List'
import { getList, populateList } from './ListService'
import ListStatsJob from './ListStatsJob'
import App from '../app'
import JourneyProcessJob from '../journey/JourneyProcessJob'

interface ListPopulateParams {
    listId: number
    projectId: number
    syncJourneys?: boolean
}

export default class ListPopulateJob extends Job {
    static $name = 'list_populate_job'

    static from(listId: number, projectId: number, syncJourneys?: boolean): ListPopulateJob {
        return new this({ listId, projectId, syncJourneys })
    }

    static async handler({ listId, projectId, syncJourneys = false }: ListPopulateParams) {

        const list = await getList(listId, projectId) as DynamicList
        if (!list) return

        await populateList(list, list.rule)

        await ListStatsJob.from(listId, projectId).queue()

        if (syncJourneys) {
            const ref = await enterAllUnstartedJourneysFromList(list)
            for await (const batch of JourneyUserStep.scroll(q => q.where('ref', ref))) {
                await App.main.queue.enqueueBatch(batch.map(({ id }) => JourneyProcessJob.from({ entrance_id: id })))
            }
        }
    }
}
