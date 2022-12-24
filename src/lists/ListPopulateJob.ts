import App from '../app'
import { Job } from '../queue'
import { getList, populateList } from './ListService'
import ListStatsJob from './ListStatsJob'

interface ListPopulateParams {
    listId: number
    projectId: number
}

export default class ListPopulateJob extends Job {
    static $name = 'list_populate_job'

    static from(listId: number, projectId: number): ListPopulateJob {
        return new this({ listId, projectId })
    }

    static async handler({ listId, projectId }: ListPopulateParams) {

        const list = await getList(listId, projectId)
        if (!list) return

        await populateList(list.id, list.rule)

        App.main.queue.enqueue(ListStatsJob.from(listId, projectId))
    }
}
