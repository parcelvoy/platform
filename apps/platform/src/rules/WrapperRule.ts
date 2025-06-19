import { numComp } from './NumberRule'
import { EventRuleFrequency, EventRulePeriod, EventRuleTree, RuleTree } from './Rule'
import { RuleCheck, RuleCheckParams, RuleEvalException, RuleQueryParams } from './RuleEngine'
import { dateFromPeriod, isEventWrapper, whereQuery } from './RuleHelpers'

const checkWrapper = ({ input, registry, rule, value }: RuleCheckParams) => {

    const predicate = (child: RuleTree) => registry.get(child.type)?.check({ input, registry, rule: child, value })

    if (!rule.children) return true

    if (rule.operator === 'or') {
        return rule.children.some(predicate)
    }

    if (rule.operator === 'and') {
        return rule.children.every(predicate)
    }

    throw new RuleEvalException(rule, 'unknown operator: ' + rule.operator)
}

const periodQuery = (period: EventRulePeriod) => {
    if (period.type === 'rolling') {
        return `created_at >= now() - INTERVAL ${period.value} ${period.unit}`
    } else if (period.type === 'fixed') {
        const start = new Date(period.start_date)
        if (!period.end_date) {
            return `created_at >= '${start.toISOString()}'`
        }
        const end = new Date(period.end_date)
        return `(created_at >= '${start.toISOString()}' AND created_at <= '${end.toISOString()}')`
    }
    return undefined
}

const frequencyQuery = (frequency?: EventRuleFrequency) => {
    const count = frequency?.count ?? 1
    const operator = frequency?.operator ?? '>='
    return whereQuery('count()', operator, count)
}

const eventWrapperQuery = ({ rule, registry, projectId }: RuleQueryParams & { rule: EventRuleTree }) => {
    const children = rule.children ?? []
    const operator = rule.operator
    if (operator !== 'and' && operator !== 'or') {
        throw new RuleEvalException(rule, 'unknown operator: ' + rule.operator)
    }

    const filters = children
        .map(child => registry
            .get(child.type)
            ?.query({ registry, rule: child, projectId }),
        ).join(` ${operator} `)
    const where = [
        `project_id = ${projectId}`,
        whereQuery('name', '=', rule.value),
    ]
    if (filters) where.push(`(${filters})`)
    if (rule.frequency?.period) {
        const query = periodQuery(rule.frequency.period)
        if (query) where.push(query)
    }

    return `
        SELECT user_id AS id 
        FROM user_events 
        WHERE ${where.join(' and ')}
        GROUP BY project_id, user_id
        HAVING ${frequencyQuery(rule.frequency)}`
}

export default {
    check(params) {
        if (isEventWrapper(params.rule)) {
            if (!params.rule.value) return false
            const { operator = '>=', count = 1, period } = params.rule.frequency ?? {}

            let checkCount = 0
            for (const event of params.input.events) {

                // If names don't match, skip
                if (event.name !== params.rule.value) continue

                // If event is outside of the rule period, skip
                if (period) {
                    const { start_date } = dateFromPeriod(period)
                    if (event.created_at < start_date) continue
                }

                // If wrapper evaluates as true, increment checkCount
                if (checkWrapper({ ...params, value: event })) {
                    checkCount++

                    // Determine if we can bail early (only when checking
                    // for a minimum count otherwise need to check all)
                    if (numComp(checkCount, operator, count) && !['<', '<='].includes(operator)) {
                        return true
                    }
                }
            }
            return numComp(checkCount, operator, count)
        }
        return checkWrapper(params)
    },
    query({ rule, registry, projectId }) {
        const operator = rule.operator
        if (operator !== 'and' && operator !== 'or') {
            throw new RuleEvalException(rule, 'unknown operator: ' + rule.operator)
        }

        // Need to wrap the query to get latest version of data
        const baseQuery = 'SELECT id FROM users FINAL'

        const children = rule.children ?? []
        if (isEventWrapper(rule)) {
            return eventWrapperQuery({ rule, registry, projectId })
        } else if (!children.length) {
            return baseQuery + ' WHERE project_id = ' + projectId
        }

        const parentOperator = rule.operator === 'and' ? 'INTERSECT' : 'UNION DISTINCT'
        const userRules = children.filter(child => child.group === 'user')
        const eventRules = children.filter(child => child.group === 'event')

        const queries = []
        if (userRules.length) {
            const userQuery = `${baseQuery} PREWHERE `
                + userRules
                    .map(child => registry.get(child.type)?.query({ registry, rule: child, projectId }))
                    .join(` ${operator} `)
                + ` WHERE project_id = ${projectId}`
            queries.push(userQuery)
        }

        if (eventRules.length) {
            const eventQuery = ''
                + eventRules
                    .map(child => registry.get(child.type)?.query({ registry, rule: child, projectId }))
                    .join(` ${parentOperator} `)
            queries.push(eventQuery)
        }

        return queries.join(` ${parentOperator} `)
    },
} satisfies RuleCheck
