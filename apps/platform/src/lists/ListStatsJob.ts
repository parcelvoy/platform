import { setMilliseconds } from 'date-fns'
import App from '../app'
import { cacheGet, cacheSet } from '../config/redis'
import { Job } from '../queue'
import { UserList } from './List'
import { getList, listUserCount, updateListState } from './ListService'

interface ListStatsParams {
    listId: number
    projectId: number
    reset?: boolean
}

interface ListStatCache {
    users_count: number
    date: number
    id: number
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

        // Fetch previous values from cache
        const key = `list:${list.id}:${list.version}:users_count`
        const value = await cacheGet<ListStatCache>(App.main.redis, key)
        let date: Date | undefined
        let previousCount = 0
        let previousId = 0
        if (value && !reset) {
            date = new Date(value.date)
            previousCount = value.users_count
            previousId = value.id
        }

        // Get values since the cached values and add them to previous
        const newDate = setMilliseconds(Date.now(), 0)
        const latest = await UserList.first(
            qb => qb.where('list_id', list.id)
                .orderBy('id', 'desc')
                .limit(1),
        )
        const count = previousCount + await listUserCount(list.id, {
            sinceDate: date,
            sinceId: previousId,
            untilId: latest?.id,
        })

        // Update the list with the new totals
        await updateListState(list.id, { users_count: count })

        // Set the cache to the values we just pulled
        await cacheSet(App.main.redis, key, {
            users_count: count,
            date: newDate.getTime(),
            id: latest?.id ?? 0,
        }, 60 * 60 * 24)
    }
}
