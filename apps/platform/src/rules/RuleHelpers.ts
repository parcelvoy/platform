import jsonpath from 'jsonpath'
import Rule, { AnyJson, Operator } from './Rule'
import { Database } from '../config/database'
import { RuleCheckInput, RuleEvalException } from './RuleEngine'
import { compileTemplate } from '../render'

export const queryValue = <T>(input: RuleCheckInput, rule: Rule, cast: (item: any) => T): T | undefined => {
    const inputValue = input[rule.group]
    let path = rule.path
    if (!inputValue || !path) return undefined
    if (!path.startsWith('$.')) path = '$.' + path
    const pathValue = jsonpath.query(inputValue, path)?.[0]
    if (!pathValue) return undefined
    return cast(pathValue)
}

export const checkArrayOperators = <T>(input: T, operator: Operator, value: T[]): boolean => {
    if (operator === 'any') {
        return value.includes(input)
    }
    if (operator === 'none') {
        return !value.includes(input)
    }
    return false
}

export const compile = <Y>(rule: Rule, cast: (item: AnyJson) => Y): Y => {
    const value = rule.value
    if (!value) {
        throw new RuleEvalException(rule, 'value required for operator')
    }
    const compiledValue = typeof value === 'string' && value.includes('{')
        ? compileTemplate(value)({})
        : value
    return cast(compiledValue)
}

export const whereQuery = <T extends AnyJson | Date>({ builder, isJson, column, path, wrapper }: QueryRuleParams, operator: string, value: T): Database.QueryBuilder<any> => {

    // Edge case since Knex doesn't support `IN` for JSON
    if (isJson && Array.isArray(value)) {
        if (operator === 'in') {
            return builder.where(qb => {
                for (const item of value) {
                    qb.orWhereJsonPath(column, path, '=', item)
                }
            })
        }
        if (operator === 'not in') {
            return builder.whereNot(qb => {
                for (const item of value) {
                    qb.orWhereJsonPath(column, path, '=', item)
                }
            })
        }
    }

    if (wrapper === 'or') {
        return isJson
            ? builder.orWhereJsonPath(column, path, operator, value)
            : builder.orWhere(column, operator, value)
    }
    return isJson
        ? builder.whereJsonPath(column, path, operator, value)
        : builder.where(column, operator, value)
}

export const whereQueryNullable = ({ builder, isJson, column, path, wrapper }: QueryRuleParams, isNull: boolean): Database.QueryBuilder<any> => {
    if (wrapper === 'or') {
        isJson
            ? builder.orWhereJsonPath(column, path, isNull ? '=' : '!=', null)
            : builder.orWhere(column, isNull ? 'IS NULL' : 'IS NOT NULL')
    }
    return isJson
        ? builder.whereJsonPath(column, path, isNull ? '=' : '!=', null)
        : builder.where(column, isNull ? 'IS NULL' : 'IS NOT NULL')
}

interface QueryRuleParams {
    builder: Database.QueryBuilder<any>
    table: string
    isJson: boolean
    column: string
    path: string
    wrapper: 'and' | 'or'
}

const reservedPaths = {
    user: [
        'external_id',
        'email',
        'phone',
        'timezone',
        'locale',
        'created_at',
    ],
    event: [
        'name',
        'created_at',
    ],
}

export const queryRuleParams = (
    builder: Database.QueryBuilder<any>,
    rule: Rule,
    wrapper: 'and' | 'or',
): QueryRuleParams => {
    const table = rule.group === 'user' ? 'users' : 'user_events'

    // check to see if the the path is a reserved top-level field
    let path = rule.path ?? ''
    if (path.startsWith('$.')) path = path.substring(2)

    // 'external_id' is exposed as 'id' in TemplateUser
    if (path === 'id') path = 'external_id'

    // add back the json path prefix if this is non-reserved custom json field
    const isJson = !reservedPaths[rule.group]?.includes(path)
    if (isJson) {
        path = '$.' + path
    }
    const column = `${table}.${isJson ? 'data' : path}`

    return { builder, table, isJson, column, path, wrapper }
}

export const isEventWrapper = (rule: Rule) => {
    return rule.group === 'event'
        && rule.path === '$.name'
}
