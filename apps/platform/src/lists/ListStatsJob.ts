import { Job } from '../queue'
import { getList, listUserCount, updateList } from './ListService'

interface ListStatsParams {
    listId: number
    projectId: number
}

export default class ListStatsJob extends Job {
    static $name = 'list_stats_job'

    static from(listId: number, projectId: number): ListStatsJob {
        return new this({ listId, projectId })
    }

    static async handler({ listId, projectId }: ListStatsParams) {

        const list = await getList(listId, projectId)
        if (!list) return

        await updateList(list.id, {
            users_count: await listUserCount(list.id),
        })
    }
}
