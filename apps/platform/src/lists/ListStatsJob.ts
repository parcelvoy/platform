import App from '../app'
import { cacheGet, cacheSet } from '../config/redis'
import { Job } from '../queue'
import { getList, listUserCount, updateList } from './ListService'

interface ListStatsParams {
    listId: number
    projectId: number
}

interface ListStatCache {
    users_count: number
    date: number
}

export default class ListStatsJob extends Job {
    static $name = 'list_stats_job'

    static from(listId: number, projectId: number): ListStatsJob {
        return new this({ listId, projectId })
    }

    static async handler({ listId, projectId }: ListStatsParams) {

        const list = await getList(listId, projectId)
        if (!list) return

        // Fetch previous values from cache
        const key = `list:${list.id}:users_count`
        const value = await cacheGet<ListStatCache>(App.main.redis, key)
        let date: Date | undefined
        let previousCount = 0
        if (value) {
            date = new Date(value.date)
            previousCount = value.users_count
        }

        // Get values since the cached values and add them to previous
        const newDate = new Date()
        const count = previousCount + await listUserCount(list.id, date)

        // Update the list with the new totals
        await updateList(list.id, { users_count: count })

        // Set the cache to the values we just pulled
        await cacheSet(App.main.redis, key, {
            users_count: count,
            date: newDate.getTime(),
        }, 60 * 60 * 24)
    }
}
