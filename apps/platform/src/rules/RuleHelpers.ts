import jsonpath from 'jsonpath'
import Rule, { AnyJson, Operator } from './Rule'
import { Database } from '../config/database'
import { RuleCheckInput, RuleEvalException } from './RuleEngine'
import { compileTemplate } from '../render'

export const queryValue = <T>(input: RuleCheckInput, rule: Rule, cast: (item: any) => T): T | undefined => {
    const inputValue = input[rule.group]
    if (!inputValue) return undefined
    const pathValue = jsonpath.query(input[rule.group], rule.path)?.[0]
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

export const isJsonPath = (path: string): boolean => {
    return path.includes('data')
}

export const jsonPathPrune = (isJson: boolean, path: string): string => {
    return isJson
        ? path.replace('$.data', '$')
        : path.replace('$.', '')
}

export const whereQuery = <T extends AnyJson>({ builder, isJson, column, path, wrapper }: QueryRuleParams, operator: string, value: T): Database.QueryBuilder<any> => {

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

export const queryRuleParams = (
    builder: Database.QueryBuilder<any>,
    rule: Rule,
    wrapper: 'and' | 'or',
): QueryRuleParams => {
    const table = rule.group === 'user' ? 'users' : 'user_events'
    const isJson = isJsonPath(rule.path)
    const path = jsonPathPrune(isJson, rule.path)
    const column = `${table}.${isJson ? 'data' : path}`
    return { builder, table, isJson, column, path, wrapper }
}

export const isEventWrapper = (rule: Rule) => {
    return rule.group === 'event'
        && rule.path === '$.name'
}
