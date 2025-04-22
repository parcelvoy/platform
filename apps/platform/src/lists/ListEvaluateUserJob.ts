import App from '../app'
import { cacheIncr } from '../config/redis'
import { Job } from '../queue'
import { getUser } from '../users/UserRepository'
import { DynamicList } from './List'
import { CacheKeys, cleanupList, evaluateUserList, getList } from './ListService'

interface ListEvaluateUserParams {
    listId: number
    userId: number
    projectId: number
    version: number
    totalCount: number
}

export default class ListEvaluateUserJob extends Job {
    static $name = 'list_evaluate_user_job'

    static from(params: ListEvaluateUserParams): ListEvaluateUserJob {
        return new this(params)
    }

    static async handler({ listId, userId, projectId, version, totalCount }: ListEvaluateUserParams) {

        const list = await getList(listId, projectId) as DynamicList
        if (!list) return

        // Check to see if we are still evaluating the latest
        // version of the list ruleset
        if (list.version !== version) return

        const evaluate = async () => {
            const user = await getUser(userId, projectId)
            if (!user) return
            await evaluateUserList(user, list)
        }

        // No matter what always increment the progress
        try {
            await evaluate()
        } finally {
            const cacheKey = CacheKeys.populationProgress(list)
            const count = await cacheIncr(App.main.redis, cacheKey, 1, 86400)
            if (count >= totalCount) {
                await cleanupList(list)
            }
        }
    }
}
