import { differenceInHours } from 'date-fns'
import { Job } from '../queue'
import List from './List'
import ListStatsJob from './ListStatsJob'
import ListRefreshJob from './ListRefreshJob'

export default class ProcessListsJob extends Job {
    static $name = 'process_lists_job'

    static async handler() {

        const lists = await List.all(qb => qb.whereNot('state', 'loading'))
        for (const list of lists) {

            // Update stats on all lists
            await ListStatsJob.from(list.id, list.project_id).queue()

            // Refresh lists with date rules if 24hrs has elapsed
            if (list.refreshed_at
                && differenceInHours(
                    new Date(),
                    list.refreshed_at,
                ) >= 24
            ) {
                await ListRefreshJob.from(list.id, list.project_id).queue()
            }
        }
    }
}
