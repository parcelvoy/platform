import App from '../app'
import { cacheDel, cacheGet, cacheIncr } from '../config/redis'
import { Job } from '../queue'
import List from './List'
import { CacheKeys, getList, listUserCount } from './ListService'

interface ListStatsParams {
    listId: number
    projectId: number
    reset?: boolean
}

export default class ListStatsJob extends Job {
    static $name = 'list_stats_job'

    static from(
        listId: number,
        projectId: number,
        reset = false,
    ): ListStatsJob {
        return new this({ listId, projectId, reset })
    }

    static async handler({ listId, projectId, reset = false }: ListStatsParams) {

        const list = await getList(listId, projectId)
        if (!list) return

        const redis = App.main.redis
        const cacheKey = CacheKeys.memberCount(list)

        let count = await cacheGet<number>(redis, cacheKey) ?? 0
        if (!list?.users_count || reset) {
            await cacheDel(redis, cacheKey)
            count = await listUserCount(listId)
            await cacheIncr(redis, cacheKey, count)
        }

        // Update the list with the new totals
        await List.query()
            .update({ users_count: count })
            .where('id', listId)
    }
}
