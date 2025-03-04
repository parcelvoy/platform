import { Job } from '../queue'
import { matchingRulesForUser } from '../rules/RuleService'
import { getUser } from '../users/UserRepository'
import { updateUsersLists } from './ListService'

interface UserListMatchParams {
    userId: number
    projectId: number
}

export default class UserListMatchJob extends Job {
    static $name = 'user_list_match_job'

    static from(userId: number, projectId: number): UserListMatchJob {
        return new this({ userId, projectId })
    }

    static async handler({ userId, projectId }: UserListMatchParams) {

        const user = await getUser(userId, projectId)
        if (!user) return

        const results = await matchingRulesForUser(user)
        await updateUsersLists(user, results)
    }
}
