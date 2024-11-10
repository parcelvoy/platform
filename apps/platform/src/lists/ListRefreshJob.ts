import { Job } from '../queue'
import { getDateRuleTypes } from '../rules/RuleService'
import { getList, refreshList } from './ListService'

interface ListRefreshParams {
    listId: number
    projectId: number
}

export default class ListRefreshJob extends Job {
    static $name = 'list_refresh_job'

    static from(
        listId: number,
        projectId: number,
    ): ListRefreshJob {
        return new this({ listId, projectId })
    }

    static async handler({ listId, projectId }: ListRefreshParams) {

        const list = await getList(listId, projectId)
        if (!list || !list.rule_id) return

        const dateRuleTypes = await getDateRuleTypes(list.rule_id)
        if (!dateRuleTypes?.dynamic) return

        await refreshList(list, dateRuleTypes)
    }
}
