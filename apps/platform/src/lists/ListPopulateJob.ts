import { enterAllUnstartedJourneysFromList } from '../journey/JourneyService'
import { Job } from '../queue'
import { DynamicList } from './List'
import { getList, populateList } from './ListService'
import ListStatsJob from './ListStatsJob'

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
            await enterAllUnstartedJourneysFromList(list)
        }
    }
}
