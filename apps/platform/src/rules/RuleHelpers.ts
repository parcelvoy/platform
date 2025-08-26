import jsonpath from 'jsonpath'
import { AnyJson, EventRulePeriod, EventRuleTree, Operator, RuleGroup, RuleTree } from './Rule'
import { compileTemplate } from '../render'
import { visit } from '../utilities'
import { subSeconds } from 'date-fns'
import { RulePathDataType } from './ProjectRulePath'

export const queryValue = <T>(
    value: Record<string, unknown>,
    rule: RuleTree,
    cast: (item: any) => T = v => v,
): T[] => {
    let path = rule.path
    if (!value || !path) return []
    if (!path.startsWith('$.') && !path.startsWith('$[')) path = '$.' + path
    return jsonpath.query(value, path).map(v => cast(v))
}

export const userPathForQuery = (path: string) => {
    const column = path.replace('$.', '')
    if (reservedPaths.user.includes(column)) {
        return path
    }
    return '$.data' + path.replace('$', '')
}

const formattedQueryValue = (value: any) => typeof value === 'string' ? `'${value}'` : value

export const queryPath = (rule: RuleTree): string => {
    const column = rule.path.replace('$.', '')
    if (reservedPaths[rule.group].includes(column)) {
        return column
    }
    const parts = column.split('.')
    return `\`data\`.\`${parts.join('`.`')}\``
}

export const whereQuery = <T extends AnyJson | undefined>(path: string, operator: Operator, value: T, type?: string): string => {

    if (type) path = `accurateCastOrNull(${path}, '${type}')`
    if (Array.isArray(value)) {
        const parts = value.map(formattedQueryValue).join(',')

        if (operator === 'any') {
            return `${path} IN (${parts})`
        } else if (operator === 'none') {
            return `${path} NOT IN (${parts})`
        }
    }

    if (operator === 'contains') return `${path} LIKE '%${value}%'`
    if (operator === 'not contain') return `${path} NOT LIKE '%${value}%'`
    if (operator === 'starts with') return `${path} LIKE '${value}%'`
    if (operator === 'not start with') return `${path} NOT LIKE '${value}%'`

    return `${path} ${operator} ${formattedQueryValue(value)}`
}

export const whereQueryNullable = (path: string, isNull: boolean): string => {
    return `${path} ${isNull ? 'IS NULL' : 'IS NOT NULL'}`
}

// TODO: rule tree "compile step"... we shouldn't do this once per user
// it would be nice if JSON path also supported a parsed/compiled intermediate format too
export const compile = <Y>(rule: RuleTree, cast: (item: AnyJson) => Y): Y => {
    let value = rule.value as AnyJson
    if (typeof value === 'string' && value.includes('{')) {
        value = compileTemplate(value)({})
    }
    return cast(value)
}

export const reservedPaths: Record<RuleGroup, string[]> = {
    user: [
        'external_id',
        'email',
        'phone',
        'timezone',
        'locale',
        'created_at',
        'has_push_device',
    ],
    event: [
        'name',
        'created_at',
    ],
    parent: [],
}

export const reservedPathDataType = (path: string): RulePathDataType => {
    return path === 'created_at' ? 'date' : 'string'
}

export const isEventWrapper = (rule: RuleTree): rule is EventRuleTree => {
    return rule.group === 'event'
        && (rule.path === '$.name' || rule.path === 'name')
}

export const dateFromPeriod = (period: EventRulePeriod): { start_date: Date, end_date?: Date } => {
    if (period.type === 'fixed') {
        return {
            start_date: new Date(period.start_date),
            end_date: period.end_date ? new Date(period.end_date) : undefined,
        }
    }

    const intervals = {
        minute: 60,
        hour: 60 * 60,
        day: 24 * 60 * 60,
        week: 7 * 24 * 60 * 60,
        month: 30 * 24 * 60 * 60,
        year: 365 * 24 * 60 * 60,
    }
    const offset = period.value * intervals[period.unit]
    return {
        start_date: subSeconds(Date.now(), offset),
    }
}

export type RuleEventParam = { name: string, since?: Date }

export const getRuleEventParams = (rule: RuleTree): RuleEventParam[] => {
    const params: RuleEventParam[] = []
    visit(rule, r => r.children, r => {
        if (isEventWrapper(r)) {
            const name = r.value
            if (typeof name === 'string') {
                params.push({
                    name,
                    since: r.frequency ? dateFromPeriod(r.frequency?.period).start_date : undefined,
                })
            }
        }
    })
    return params
}
